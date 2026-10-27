# 启动组长交付的 Spring Boot 后端（真实 MySQL），供前端联调
# 用法：.\scripts\run-backend.ps1 [-Port 8080] [-AdminPassword '...'] [-Foreground]
# 说明：
#   1) 数据库为 docs/leader/week2/schema.sql 建出的 takeout_course，连接账号 sky_app；
#   2) 首次启动时用 COURSE_ADMIN_PASSWORD 建立 admin 员工账号（已存在则不重置）；
#   3) 两组 JWT 密钥固定为本地演示值，避免重启后令牌失效；生产/实机部署应改为环境注入。
param(
    [int]$Port = 8080,
    [string]$AdminPassword = $Env:COURSE_ADMIN_PASSWORD,
    [switch]$Foreground
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'env.ps1')

if (-not $AdminPassword) { throw '缺少管理员口令：请在 config\env.local.ps1 配置 COURSE_ADMIN_PASSWORD（或传 -AdminPassword）' }
if (-not $Env:SKY_DB_APP_PASSWORD) { throw '缺少数据库口令：请在 config\env.local.ps1 配置 SKY_DB_APP_PASSWORD' }

$jar = Join-Path $root 'code\backend\sky-server\target\sky-server-1.0-SNAPSHOT.jar'
if (-not (Test-Path $jar)) {
    throw "未找到后端 JAR：$jar。请先在 code\backend 执行 mvn -DskipTests package"
}

$env:SERVER_PORT = "$Port"
$env:DB_URL = 'jdbc:mysql://127.0.0.1:3306/takeout_course?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai'
$env:DB_USERNAME = 'sky_app'
$env:DB_PASSWORD = $Env:SKY_DB_APP_PASSWORD
$env:COURSE_ADMIN_PASSWORD = $AdminPassword
$env:SKY_JWT_ADMINSECRETKEY = 'local-demo-admin-secret-key-change-before-deploy-32'
$env:SKY_JWT_USERSECRETKEY = 'local-demo-user-secret-key-change-before-deploy-32'

Write-Host "==> 启动后端：http://127.0.0.1:$Port （库 takeout_course / 账号 $($env:DB_USERNAME)）" -ForegroundColor Cyan
Write-Host "    管理员账号：admin / $AdminPassword（首次启动创建）" -ForegroundColor DarkGray
Write-Host "    契约：http://127.0.0.1:$Port/openapi.yaml   文档：http://127.0.0.1:$Port/doc.html" -ForegroundColor DarkGray

$tmpDir = Join-Path $root '.tmp'
$env:TEMP = $tmpDir
$env:TMP = $tmpDir
$log = Join-Path $root '.tmp\backend.log'
New-Item -ItemType Directory -Force -Path (Join-Path $root '.tmp') | Out-Null

if ($Foreground) {
    & "$Env:JAVA_HOME\bin\java.exe" "-Djava.io.tmpdir=$tmpDir" -jar $jar --spring.profiles.active=course
} else {
    Start-Process -FilePath "$Env:JAVA_HOME\bin\java.exe" `
        -ArgumentList @("-Djava.io.tmpdir=$tmpDir", '-jar', $jar, '--spring.profiles.active=course') `
        -RedirectStandardOutput $log -RedirectStandardError "$log.err" `
        -WindowStyle Hidden
    Write-Host "已在后台启动，日志：$log" -ForegroundColor Green
}
