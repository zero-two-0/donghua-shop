# 一键回归：接口三套 + 静态部署（可选浏览器两套）
# 用法：
#   .\scripts\run-all-tests.ps1              # 接口 + 静态部署（自动起停 serve-dist）
#   .\scripts\run-all-tests.ps1 -WithUI      # 追加浏览器渲染与点击流（需 5173/5174 已启动）
#   .\scripts\run-all-tests.ps1 -WithUI -StartDev   # 连 dev server 也自动起停
param(
    [switch]$WithUI,
    [switch]$StartDev
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\env.ps1" | Out-Null

if (-not $Env:COURSE_ADMIN_PASSWORD) {
    throw ' 缺少 COURSE_ADMIN_PASSWORD：请在 config\env.local.ps1 配置'
}

$results = New-Object System.Collections.Generic.List[object]
function Add-Result($name, $code) {
    $ok = ($code -eq 0)
    $results.Add([pscustomobject]@{ 套件 = $name; 结果 = $(if ($ok) { 'PASS' } else { 'FAIL' }) })
    Write-Host ("  {0,-22} {1}" -f $name, $(if ($ok) { 'PASS' } else { 'FAIL' })) -ForegroundColor $(if ($ok) { 'Green' } else { 'Red' })
}

function Test-Port($port) {
    return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

Write-Host '== 前置检查 ==' -ForegroundColor Cyan
if (-not (Test-Port 8080)) { throw ' 后端 8080 未启动：先跑 .\scripts\run-backend.ps1（或 start-all.ps1）' }
Write-Host '  后端 8080 正常'

$projRoot = Split-Path $PSScriptRoot -Parent

Write-Host '== 接口套件 ==' -ForegroundColor Cyan
Push-Location $projRoot
try {
    node scripts\smoke-api.mjs        2>&1 | Select-Object -Last 1
    Add-Result '主流程 37 项' $LASTEXITCODE
    node scripts\smoke-authz.mjs      2>&1 | Select-Object -Last 1
    Add-Result '越权/权限 22 项' $LASTEXITCODE
    node scripts\smoke-exceptions.mjs 2>&1 | Select-Object -Last 1
    Add-Result '异常/边界 16 项' $LASTEXITCODE

    Write-Host '== 静态部署验证（自动起停 serve-dist） ==' -ForegroundColor Cyan
    $userDist = Join-Path $projRoot 'code\frontend\user-h5\dist'
    $adminDist = Join-Path $projRoot 'code\frontend\admin-web\dist'
    if (-not (Test-Path $userDist)) { throw ' 缺少 dist：先跑 .\scripts\build-frontend.ps1' }

    $p1 = Start-Process node -ArgumentList @('scripts\serve-dist.mjs', $userDist, '8081', 'http://127.0.0.1:8080') -PassThru -WindowStyle Hidden
    $p2 = Start-Process node -ArgumentList @('scripts\serve-dist.mjs', $adminDist, '8082', 'http://127.0.0.1:8080') -PassThru -WindowStyle Hidden
    try {
        Start-Sleep -Seconds 3
        node scripts\check-static-deploy.mjs 2>&1 | Select-Object -Last 1
        Add-Result '静态部署 13 项' $LASTEXITCODE
    } finally {
        Stop-Process -Id $p1.Id -Force -ErrorAction SilentlyContinue
        Stop-Process -Id $p2.Id -Force -ErrorAction SilentlyContinue
    }

    if ($WithUI) {
        Write-Host '== 浏览器套件（Edge 无头） ==' -ForegroundColor Cyan
        $devJobs = @()
        if ($StartDev) {
            $devJobs += Start-Process node -ArgumentList @(Join-Path $projRoot 'node_modules\.bin\vite'), '--port', '5173' -WorkingDirectory (Join-Path $projRoot 'code\frontend\user-h5') -PassThru -WindowStyle Hidden
            $devJobs += Start-Process node -ArgumentList @(Join-Path $projRoot 'node_modules\.bin\vite'), '--port', '5174' -WorkingDirectory (Join-Path $projRoot 'code\frontend\admin-web') -PassThru -WindowStyle Hidden
            Start-Sleep -Seconds 8
        }
        if (-not (Test-Port 5173) -or -not (Test-Port 5174)) { Write-Host '  跳过：5173/5174 未启动（加 -StartDev 或先 start-all.ps1）' -ForegroundColor Yellow }
        else {
            node scripts\browser-check.mjs 2>&1 | Select-Object -Last 1
            Add-Result '浏览器渲染 14 项' $LASTEXITCODE
            node scripts\browser-flow.mjs 2>&1 | Select-Object -Last 1
            Add-Result '点击流 14 项' $LASTEXITCODE
        }
        foreach ($j in $devJobs) { Stop-Process -Id $j.Id -Force -ErrorAction SilentlyContinue }
    }
} finally {
    Pop-Location
}

Write-Host ''
Write-Host '== 汇总 ==' -ForegroundColor Cyan
$results | Format-Table -AutoSize | Out-String -Width 60 | Write-Host
$failed = ($results | Where-Object { $_.结果 -eq 'FAIL' } | Measure-Object).Count
if ($failed -gt 0) { Write-Host "有 $failed 个套件失败" -ForegroundColor Red; exit 1 }
Write-Host '全部套件通过' -ForegroundColor Green
