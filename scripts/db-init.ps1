# 数据库初始化：建库、建专用账号、导入表结构与种子数据（可重复执行）
# 前置：config\env.local.ps1 中配置 DH_DB_ROOT_PASSWORD（root 口令，仅本机使用，不入库）
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'env.ps1')

if (-not $Env:DH_DB_ROOT_PASSWORD) {
    throw "缺少 root 口令。请复制 config\env.example.ps1 为 config\env.local.ps1 并填写 DH_DB_ROOT_PASSWORD。"
}

$mysql = $Env:DH_MYSQL
$schema = Join-Path $root 'docs\database\schema.sql'
$data   = Join-Path $root 'docs\database\data.sql'

# 用 MYSQL_PWD 传递口令，避免出现在命令行与进程列表里
$env:MYSQL_PWD = $Env:DH_DB_ROOT_PASSWORD

function Invoke-Mysql([string]$sql, [string]$label) {
    Write-Host "==> $label" -ForegroundColor Cyan
    $tmp = Join-Path $env:TEMP ("dh_" + [guid]::NewGuid().ToString('N') + ".sql")
    # 脚本以 UTF-8 无 BOM 写出，配合 --default-character-set=utf8mb4
    [System.IO.File]::WriteAllText($tmp, $sql, (New-Object System.Text.UTF8Encoding($false)))
    & $mysql -h $Env:DH_DB_HOST -P $Env:DH_DB_PORT -u $Env:DH_DB_ROOT_USER --default-character-set=utf8mb4 -e "source $($tmp -replace '\\','/')"
    $code = $LASTEXITCODE
    Remove-Item -LiteralPath $tmp -Force
    if ($code -ne 0) { throw "$label 失败（mysql 退出码 $code）" }
}

$bootstrap = @"
CREATE DATABASE IF NOT EXISTS ``donghua_shop`` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_general_ci;
CREATE USER IF NOT EXISTS 'dh_shop'@'localhost' IDENTIFIED BY '$($Env:DH_DB_APP_PASSWORD)';
ALTER USER 'dh_shop'@'localhost' IDENTIFIED BY '$($Env:DH_DB_APP_PASSWORD)';
CREATE USER IF NOT EXISTS 'dh_shop'@'127.0.0.1' IDENTIFIED BY '$($Env:DH_DB_APP_PASSWORD)';
ALTER USER 'dh_shop'@'127.0.0.1' IDENTIFIED BY '$($Env:DH_DB_APP_PASSWORD)';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER, REFERENCES ON ``donghua_shop``.* TO 'dh_shop'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER, REFERENCES ON ``donghua_shop``.* TO 'dh_shop'@'127.0.0.1';
FLUSH PRIVILEGES;
"@
Invoke-Mysql $bootstrap '创建数据库与专用账号'

Invoke-Mysql ([System.IO.File]::ReadAllText($schema)) '导入表结构 schema.sql'
Invoke-Mysql ([System.IO.File]::ReadAllText($data))   '导入种子数据 data.sql'

Write-Host "==> 校验" -ForegroundColor Cyan
$env:MYSQL_PWD = $Env:DH_DB_APP_PASSWORD
& $mysql -h $Env:DH_DB_HOST -P $Env:DH_DB_PORT -u $Env:DH_DB_USER $Env:DH_DB_NAME --default-character-set=utf8mb4 -e @"
SELECT '表数量' AS 指标, COUNT(*) AS 值 FROM information_schema.tables WHERE table_schema = 'donghua_shop'
UNION ALL SELECT '分类', COUNT(*) FROM category
UNION ALL SELECT '菜品', COUNT(*) FROM dish
UNION ALL SELECT '套餐', COUNT(*) FROM setmeal
UNION ALL SELECT '员工', COUNT(*) FROM employee
UNION ALL SELECT '订单', COUNT(*) FROM orders;
"@
if ($LASTEXITCODE -ne 0) { throw '校验查询失败' }
$env:MYSQL_PWD = $null
Write-Host '数据库初始化完成。' -ForegroundColor Green
