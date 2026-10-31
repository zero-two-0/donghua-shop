# 一键启动：MySQL 检查 → 后端(8080) → 用户端 H5(5173) → 管理端(5174)
# 用法：
#   .\scripts\start-all.ps1                  # 需要时启动，已在运行的跳过
#   .\scripts\start-all.ps1 -Restart         # 先停掉旧的再启动
# 停止：.\scripts\stop-all.ps1
param(
    [switch]$Restart,
    [int]$BackendPort = 8080,
    [string]$AdminPassword = $null
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'env.ps1')

$tmp = Join-Path $root '.tmp'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$env:TEMP = $tmp
$env:TMP = $tmp

function Test-Port([int]$port) {
    return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

function Wait-Port([int]$port, [int]$seconds = 60) {
    for ($i = 0; $i -lt $seconds; $i++) {
        if (Test-Port $port) { return $true }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Wait-Http([string]$url, [int]$seconds = 60) {
    for ($i = 0; $i -lt $seconds; $i++) {
        try {
            $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
            if ($r.StatusCode -eq 200) { return $true }
        } catch { }
        Start-Sleep -Seconds 1
    }
    return $false
}

if ($Restart) {
    & (Join-Path $PSScriptRoot 'stop-all.ps1')
    Start-Sleep -Seconds 2
}

Write-Host '==> 1/4 检查 MySQL' -ForegroundColor Cyan
$svc = Get-Service -Name 'MySQL80' -ErrorAction SilentlyContinue
if (-not $svc) { throw '未找到 MySQL80 服务，请先安装 MySQL 8' }
if ($svc.Status -ne 'Running') {
    Write-Host '    MySQL80 未启动，尝试启动…' -ForegroundColor Yellow
    try { Start-Service MySQL80; Start-Sleep -Seconds 3 } catch { throw "启动 MySQL80 失败：$($_.Exception.Message)（可能需要管理员权限）" }
}
Write-Host '    MySQL80 Running' -ForegroundColor Green

Write-Host '==> 2/4 后端 8080' -ForegroundColor Cyan
if (Test-Port $BackendPort) {
    Write-Host "    已在运行，跳过（端口 $BackendPort）" -ForegroundColor DarkGray
} else {
    if (-not $AdminPassword) { $AdminPassword = $Env:COURSE_ADMIN_PASSWORD }
if (-not $AdminPassword) { throw '缺少管理员口令：请在 config\env.local.ps1 配置 COURSE_ADMIN_PASSWORD' }
if (-not $Env:SKY_DB_APP_PASSWORD) { throw '缺少数据库口令：请在 config\env.local.ps1 配置 SKY_DB_APP_PASSWORD' }
$jar = Join-Path $root 'code\backend\sky-server\target\sky-server-1.0-SNAPSHOT.jar'
    if (-not (Test-Path $jar)) {
        throw "未找到后端 JAR：$jar`n请先执行：cd code\backend ; mvn -B -DskipTests package"
    }
    $env:SERVER_PORT = "$BackendPort"
    $env:DB_URL = 'jdbc:mysql://127.0.0.1:3306/takeout_course?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai'
    $env:DB_USERNAME = 'sky_app'
    $env:DB_PASSWORD = $Env:SKY_DB_APP_PASSWORD
    $env:COURSE_ADMIN_PASSWORD = $AdminPassword
    $env:SKY_JWT_ADMINSECRETKEY = 'local-demo-admin-secret-key-change-before-deploy-32'
    $env:SKY_JWT_USERSECRETKEY = 'local-demo-user-secret-key-change-before-deploy-32'

    Start-Process -FilePath (Join-Path $Env:JAVA_HOME 'bin\java.exe') `
        -ArgumentList @("-Djava.io.tmpdir=$tmp", '-jar', $jar, '--spring.profiles.active=course') `
        -RedirectStandardOutput (Join-Path $tmp 'backend.log') `
        -RedirectStandardError (Join-Path $tmp 'backend.err.log') `
        -WindowStyle Hidden
    if (-not (Wait-Http "http://127.0.0.1:$BackendPort/user/shop/status" 90)) {
        throw "后端 90 秒内未就绪，请看日志：$tmp\backend.log"
    }
    Write-Host '    后端已就绪' -ForegroundColor Green
}

Write-Host '==> 3/4 启动前端 dev server' -ForegroundColor Cyan
$pnpm = $Env:DH_PNPM
if (-not (Test-Path $pnpm)) { throw "未找到 pnpm：$pnpm" }

$apps = @(
    @{ name = 'user-h5';   filter = 'user-h5';   port = 5173; url = 'http://127.0.0.1:5173/' },
    @{ name = 'admin-web'; filter = 'admin-web'; port = 5174; url = 'http://127.0.0.1:5174/' }
)
foreach ($app in $apps) {
    if (Test-Port $app.port) {
        Write-Host "    $($app.name) 已在 $($app.port) 运行，跳过" -ForegroundColor DarkGray
        continue
    }
    $log = Join-Path $tmp ("dev-" + $app.name + ".log")
    Start-Process -FilePath $pnpm `
        -ArgumentList @('--filter', $app.filter, 'dev') `
        -WorkingDirectory (Join-Path $root 'code\frontend') `
        -RedirectStandardOutput $log `
        -RedirectStandardError (Join-Path $tmp ("dev-" + $app.name + ".err.log")) `
        -WindowStyle Hidden
    if (Wait-Http $app.url 90) {
        Write-Host "    $($app.name) 已就绪 → $($app.url)" -ForegroundColor Green
    } else {
        Write-Host "    $($app.name) 未在 90 秒内就绪，见日志 $log" -ForegroundColor Yellow
    }
}

Write-Host '==> 4/4 汇总' -ForegroundColor Cyan
$shop = ''
try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$BackendPort/user/shop/status" -UseBasicParsing -TimeoutSec 5
    $shop = $r.Content
} catch { $shop = 'N/A' }
Write-Host ''
Write-Host '  用户端 H5    http://127.0.0.1:5173   （身份：demo-user / demo-user-2）' -ForegroundColor White
Write-Host ('  管理端 Web   http://127.0.0.1:5174   （账号：admin / ' + $AdminPassword + '）') -ForegroundColor White
Write-Host "  后端接口     http://127.0.0.1:$BackendPort  /openapi.yaml  /doc.html" -ForegroundColor White
Write-Host "  营业状态返回 $shop" -ForegroundColor DarkGray
Write-Host ''
Write-Host '  停止全部： .\scripts\stop-all.ps1' -ForegroundColor DarkGray
Write-Host '  日志目录： .tmp\backend.log、.tmp\dev-user-h5.log、.tmp\dev-admin-web.log' -ForegroundColor DarkGray
