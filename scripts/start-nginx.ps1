# 用本机已安装的 Nginx 托管两端 dist 并反代后端（Windows）
# 用法：
#   .\scripts\start-nginx.ps1                                   # 自动找 nginx.exe，监听 8081/8082
#   .\scripts\start-nginx.ps1 -NginxHome D:\nginx-1.31.8        # 指定安装目录
#   .\scripts\start-nginx.ps1 -StageDir D:\nginx-site           # 指定 ASCII 中转目录（默认 C:\nginx-site）
#   .\scripts\start-nginx.ps1 -Stop                             # 停止
#
# 重要：Windows 版 nginx 用 ANSI 接口打开文件，路径里出现中文（例如 OneDrive\文档）会报
#       "1113: No mapping for the Unicode character exists in the target multi-byte code page"。
#       因此当项目路径含非 ASCII 字符时，本脚本会把 dist 复制到 ASCII 目录再让 nginx 提供服务，
#       配置与日志也放在该目录下。
param(
    [string]$NginxHome = '',
    [string]$StageDir = 'C:\nginx-site',
    [int]$UserPort = 8081,
    [int]$AdminPort = 8082,
    [int]$BackendPort = 8080,
    [switch]$Stop
)

$ErrorActionPreference = 'Stop'
$projRoot = Split-Path $PSScriptRoot -Parent

function Find-NginxHome {
    param([string]$Hint)
    if ($Hint) {
        if (Test-Path (Join-Path $Hint 'nginx.exe')) { return (Resolve-Path $Hint).Path }
        throw "指定的目录里没有 nginx.exe：$Hint"
    }
    $cmd = Get-Command nginx.exe -ErrorAction SilentlyContinue
    if ($cmd) { return (Split-Path $cmd.Source -Parent) }

    $probe = @()
    $probe += (Get-ChildItem 'C:\', 'D:\', 'C:\tools' -Directory -Filter 'nginx*' -ErrorAction SilentlyContinue).FullName
    $probe += (Get-ChildItem 'C:\Program Files', 'C:\Program Files (x86)' -Directory -Filter '*nginx*' -ErrorAction SilentlyContinue).FullName
    $probe += (Get-ChildItem 'C:\ProgramData\chocolatey\lib' -Directory -Filter '*nginx*' -ErrorAction SilentlyContinue).FullName
    $probe += (Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Directory -Filter '*nginx*' -ErrorAction SilentlyContinue).FullName
    $running = Get-Process nginx -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($running -and $running.Path) { $probe += (Split-Path $running.Path -Parent) }

    foreach ($dir in ($probe | Sort-Object -Unique)) {
        if ($dir -and (Test-Path (Join-Path $dir 'nginx.exe'))) { return $dir }
    }
    throw '找不到 nginx.exe：请用 -NginxHome 指定安装目录（例如 -NginxHome D:\nginx-1.31.8）'
}

$nginxHome = Find-NginxHome -Hint $NginxHome
$nginxExe = Join-Path $nginxHome 'nginx.exe'

function Test-Ascii([string]$s) { return -not ($s -match '[^\x00-\x7F]') }
if (-not (Test-Ascii $StageDir)) { throw "StageDir 必须是纯 ASCII 路径（当前：$StageDir）" }

$prefix = Join-Path $StageDir 'nginx'
$confDir = Join-Path $prefix 'conf'
$logDir = Join-Path $prefix 'logs'
$confPath = Join-Path $confDir 'nginx.conf'

if ($Stop) {
    if (Test-Path $confPath) { & $nginxExe -p "$prefix\" -c $confPath -s quit 2>&1 | Out-Null }
    Start-Sleep -Seconds 2
    taskkill /F /IM nginx.exe 2>&1 | Out-Null
    Write-Host ' 已停止 nginx' -ForegroundColor Yellow
    return
}

New-Item -ItemType Directory -Force -Path $confDir, $logDir, (Join-Path $prefix 'temp') | Out-Null

foreach ($port in @($UserPort, $AdminPort)) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $procName = (Get-Process -Id $conn[0].OwningProcess -ErrorAction SilentlyContinue).ProcessName
        throw "端口 $port 已被 $procName 占用，请先停止它（nginx 用：.\scripts\start-nginx.ps1 -Stop）"
    }
}

$userDist = Join-Path $projRoot 'code\frontend\user-h5\dist'
$adminDist = Join-Path $projRoot 'code\frontend\admin-web\dist'
foreach ($d in @($userDist, $adminDist)) {
    if (-not (Test-Path $d)) { throw "缺少构建产物：$d（先跑 .\scripts\build-frontend.ps1）" }
}

if (Test-Ascii $projRoot) {
    $userRoot = $userDist
    $adminRoot = $adminDist
    Write-Host ' 项目路径为 ASCII，直接使用 dist' -ForegroundColor DarkGray
} else {
    $userRoot = Join-Path $StageDir 'user-h5'
    $adminRoot = Join-Path $StageDir 'admin-web'
    Write-Host " 项目路径含中文，复制 dist -> $StageDir（nginx 只能读 ASCII 路径）" -ForegroundColor DarkGray
    foreach ($pair in @(@($userDist, $userRoot), @($adminDist, $adminRoot))) {
        New-Item -ItemType Directory -Force -Path $pair[1] | Out-Null
        robocopy $pair[0] $pair[1] /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
        if ($LASTEXITCODE -ge 8) { throw "复制失败：$($pair[0]) -> $($pair[1])（robocopy $LASTEXITCODE）" }
    }
}

function To-NginxPath([string]$p) { return ($p -replace '\\', '/') }

# nginx.exe 把运行信息写到 stderr；在 ErrorActionPreference=Stop 下会被当成异常，这里临时放开
function Invoke-Nginx {
    param([string[]]$NginxArgs)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $out = & $nginxExe @NginxArgs 2>&1
        return @{ Code = $LASTEXITCODE; Out = $out }
    } finally {
        $ErrorActionPreference = $prev
    }
}

$template = Get-Content (Join-Path $projRoot 'deploy\nginx.windows.conf.template') -Raw -Encoding UTF8
$conf = $template `
    -replace '\{\{LOG_DIR\}\}', (To-NginxPath $logDir) `
    -replace '\{\{MIME\}\}', (To-NginxPath (Join-Path $nginxHome 'conf\mime.types')) `
    -replace '\{\{USER_ROOT\}\}', (To-NginxPath $userRoot) `
    -replace '\{\{ADMIN_ROOT\}\}', (To-NginxPath $adminRoot) `
    -replace '\{\{USER_PORT\}\}', "$UserPort" `
    -replace '\{\{ADMIN_PORT\}\}', "$AdminPort" `
    -replace '\{\{BACKEND_PORT\}\}', "$BackendPort"

[System.IO.File]::WriteAllText($confPath, $conf, (New-Object System.Text.UTF8Encoding($false)))
Write-Host " 配置：$confPath" -ForegroundColor DarkGray

Write-Host ' 校验配置 ...' -ForegroundColor Cyan
$check = Invoke-Nginx @('-p', "$prefix\", '-c', $confPath, '-t')
$check.Out | ForEach-Object { Write-Host "   $_" -ForegroundColor DarkGray }
if ($check.Code -ne 0) { throw ' nginx -t 失败，看上面的错误与 logs\error.log' }

Write-Host ' 启动 nginx ...' -ForegroundColor Cyan
# 用 Start-Process 分离启动：直接 & nginx.exe 会让 PowerShell 一直等 master 进程
$startArgs = @('-p', $prefix, '-c', $confPath)
Start-Process -FilePath $nginxExe -ArgumentList $startArgs -WindowStyle Hidden | Out-Null
Start-Sleep -Seconds 4

$ok = $true
foreach ($port in @($UserPort, $AdminPort)) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) { Write-Host ("  端口 {0} 监听中（PID {1}）" -f $port, $conn[0].OwningProcess) }
    else { Write-Host "  端口 $port 未监听" -ForegroundColor Red; $ok = $false }
}
if (-not $ok) { throw ' nginx 未正常监听，查看 logs\error.log' }

Write-Host ''
Write-Host ' 用户端 H5   http://127.0.0.1:' -NoNewline; Write-Host $UserPort -ForegroundColor White
Write-Host ' 管理端 Web  http://127.0.0.1:' -NoNewline; Write-Host $AdminPort -ForegroundColor White
Write-Host (' 后端反代    http://127.0.0.1:' + $BackendPort + '（/user、/admin、/assets/*.svg）') -ForegroundColor DarkGray
Write-Host ' 停止：.\scripts\start-nginx.ps1 -Stop' -ForegroundColor DarkGray
