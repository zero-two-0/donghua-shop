# 构建两个前端工程（用户 H5 + 管理 Web）
# 说明：
#   1) esbuild 会把中间文件写到系统 TEMP；本机 OneDrive 环境下的 TEMP 目录偶发拒绝删除，
#      因此构建前把 TEMP/TMP 指向项目内的 .tmp，保证构建可重复；
#   2) vite/pnpm 的进度与告警写到 stderr，PowerShell 5.1 会把 stderr 当成错误对象打印，
#      这里改成用 cmd 重定向到日志再回显，输出干净，也不受 ErrorActionPreference 影响。
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
$tmp = Join-Path $root '.tmp'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$env:TEMP = $tmp
$env:TMP = $tmp

$pnpm = Join-Path $root 'tools\pnpm\node_modules\.bin\pnpm.cmd'
$log = Join-Path $tmp 'frontend-build.log'

function Invoke-PnpmBuild([string]$filter, [string]$label) {
    Write-Host "==> 构建 $label" -ForegroundColor Cyan
    $cmd = '"' + $pnpm + '" --filter ' + $filter + ' build > "' + $log + '" 2>&1'
    & cmd /c $cmd
    $code = $LASTEXITCODE
    if (Test-Path $log) { Get-Content -LiteralPath $log -Encoding UTF8 | ForEach-Object { Write-Host $_ } }
    if ($code -ne 0) { throw "$label 构建失败（退出码 $code，日志 $log）" }
}

Push-Location (Join-Path $root 'code\frontend')
try {
    Invoke-PnpmBuild 'user-h5' '用户端 H5（Vue3 + Vant）'
    Invoke-PnpmBuild 'admin-web' '管理端 Web（Vue3 + Element Plus）'

    Write-Host '构建完成：' -ForegroundColor Green
    foreach ($app in 'user-h5', 'admin-web') {
        $dist = Join-Path $root "code\frontend\$app\dist"
        $files = Get-ChildItem $dist -Recurse -File
        $kb = [math]::Round((($files | Measure-Object Length -Sum).Sum / 1KB), 1)
        Write-Host ("  {0,-10} {1,3} 个文件  {2,8} KB" -f $app, $files.Count, $kb)
    }
} finally {
    Pop-Location
}
