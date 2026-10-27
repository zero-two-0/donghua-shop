# 按组长第 2 周 schema.sql 初始化课程库 takeout_course（可重复执行：会重建该库，不动其他库）
# 前置：config\env.local.ps1 中配置 DH_DB_ROOT_PASSWORD
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'env.ps1')

if (-not $Env:DH_DB_ROOT_PASSWORD) { throw '缺少 root 口令，请先配置 config\env.local.ps1' }

$mysql = $Env:DH_MYSQL
$schema = Join-Path $root 'docs\leader\week2\schema.sql'
if (-not (Test-Path $schema)) { throw "未找到组长 schema：$schema" }

$dbName = 'takeout_course'
$appUser = 'sky_app'
$appPwd = $Env:SKY_DB_APP_PASSWORD
if (-not $appPwd) { throw '缺少 SKY_DB_APP_PASSWORD：请在 config\env.local.ps1 中配置课程库应用账号口令（模板见 env.example.ps1）' }

$env:MYSQL_PWD = $Env:DH_DB_ROOT_PASSWORD
function Invoke-Sql([string]$sql, [string]$label) {
    Write-Host "==> $label" -ForegroundColor Cyan
    $tmp = Join-Path $env:TEMP ('sky_' + [guid]::NewGuid().ToString('N') + '.sql')
    [System.IO.File]::WriteAllText($tmp, $sql, (New-Object System.Text.UTF8Encoding($false)))
    & $mysql -h 127.0.0.1 -P 3306 -u root --default-character-set=utf8mb4 -e "source $($tmp -replace '\\','/')"
    $code = $LASTEXITCODE
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
    if ($code -ne 0) { throw "$label 失败（退出码 $code）" }
}

Invoke-Sql "DROP DATABASE IF EXISTS ``$dbName``; CREATE DATABASE ``$dbName`` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" '重建空库 takeout_course'
Invoke-Sql ("USE ``$dbName``;`r`n" + [System.IO.File]::ReadAllText($schema)) '执行组长 schema.sql（建表 + 种子数据）'

$grant = @"
CREATE USER IF NOT EXISTS '$appUser'@'localhost' IDENTIFIED BY '$appPwd';
ALTER USER '$appUser'@'localhost' IDENTIFIED BY '$appPwd';
CREATE USER IF NOT EXISTS '$appUser'@'127.0.0.1' IDENTIFIED BY '$appPwd';
ALTER USER '$appUser'@'127.0.0.1' IDENTIFIED BY '$appPwd';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE, SHOW VIEW ON ``$dbName``.* TO '$appUser'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE, SHOW VIEW ON ``$dbName``.* TO '$appUser'@'127.0.0.1';
FLUSH PRIVILEGES;
"@
Invoke-Sql $grant "创建应用账号 $appUser"

$env:MYSQL_PWD = $appPwd
Write-Host '==> 校验' -ForegroundColor Cyan
& $mysql -h 127.0.0.1 -u $appUser $dbName --default-character-set=utf8mb4 -e @"
SELECT '表' AS 指标, COUNT(*) AS 值 FROM information_schema.tables WHERE table_schema='takeout_course'
UNION ALL SELECT '分类', COUNT(*) FROM category
UNION ALL SELECT '菜品', COUNT(*) FROM dish
UNION ALL SELECT '套餐', COUNT(*) FROM setmeal
UNION ALL SELECT '用户', COUNT(*) FROM user
UNION ALL SELECT '地址', COUNT(*) FROM address_book;
"@
if ($LASTEXITCODE -ne 0) { throw '校验失败' }
$env:MYSQL_PWD = $null
Write-Host "课程库 $dbName 初始化完成（应用账号 $appUser）。" -ForegroundColor Green
