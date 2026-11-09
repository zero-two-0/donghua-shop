# 清掉联调/越权/课程测试留下的订单与地址，只保留自然演示数据
# 用法：.\scripts\reset-demo-data.ps1  →  .\scripts\seed-demo-orders.ps1
#       演示/截图前执行，避免页面上出现“越权用例-A / 联调收货人 / 课程测试地址”这类痕迹
[CmdletBinding()]
param([string]$Database = 'takeout_course')

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'env.ps1') | Out-Null

$appUser = $env:SKY_DB_APP_USER
$appPwd = $env:SKY_DB_APP_PASSWORD
if (-not $appUser) { $appUser = 'sky_app' }
if (-not $appPwd) { throw '缺少数据库应用口令：请先配置 SKY_DB_APP_PASSWORD' }

$mysql = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe'
if (-not (Test-Path $mysql)) {
  $cmd = Get-Command mysql.exe -ErrorAction SilentlyContinue
  if (-not $cmd) { throw '找不到 mysql.exe' }
  $mysql = $cmd.Source
}

$sql = @"
SET NAMES utf8mb4;
-- 1) 测试订单（联调/越权/课程测试地址产生的）连同明细一起删掉，保留自然订单
DELETE d FROM order_detail d JOIN orders o ON o.id = d.order_id
 WHERE o.consignee LIKE '联调%' OR o.consignee LIKE '越权%' OR o.consignee LIKE '演示收货人%'
    OR o.address LIKE '%联调%' OR o.address LIKE '%越权%' OR o.address LIKE '%课程测试地址%';
DELETE FROM orders
 WHERE consignee LIKE '联调%' OR consignee LIKE '越权%' OR consignee LIKE '演示收货人%'
    OR address LIKE '%联调%' OR address LIKE '%越权%' OR address LIKE '%课程测试地址%';
-- 2) 测试地址（含课程种子里带“课程测试地址/演示收货人”的那几条）
DELETE FROM address_book
 WHERE consignee LIKE '联调%' OR consignee LIKE '越权%' OR consignee LIKE '演示收货人%'
    OR detail LIKE '%联调%' OR detail LIKE '%越权%' OR detail LIKE '%课程测试地址%';
-- 3) 购物车清空（截图从干净状态开始）
DELETE FROM shopping_cart;
-- 4) 修正种子地址的城市字段（避免“上海市上海市松江区”重复）
UPDATE address_book SET province_name = '上海市', city_name = '上海市', district_name = '松江区'
 WHERE district_name IS NULL OR district_name = '' OR district_name = '课程测试地址';
-- 5) 保证每个演示用户有一条默认地址
INSERT INTO address_book (user_id,consignee,phone,sex,province_name,city_name,district_name,detail,label,is_default)
SELECT 1,'陈子涵','13800001234','1','上海市','上海市','松江区','东华大学 12 号宿舍楼 305','学校',1
 WHERE NOT EXISTS (SELECT 1 FROM address_book WHERE user_id = 1);
INSERT INTO address_book (user_id,consignee,phone,sex,province_name,city_name,district_name,detail,label,is_default)
SELECT 2,'林书瑶','13900005678','0','上海市','上海市','松江区','东华大学 8 号宿舍楼 212','学校',1
 WHERE NOT EXISTS (SELECT 1 FROM address_book WHERE user_id = 2);
"@

$sqlFile = Join-Path $env:TEMP ("reset-demo-" + [guid]::NewGuid().ToString('N') + ".sql")
[System.IO.File]::WriteAllText($sqlFile, $sql, (New-Object System.Text.UTF8Encoding($false)))
try {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    Get-Content $sqlFile -Raw -Encoding UTF8 | & $mysql --protocol=TCP -h 127.0.0.1 -P 3306 -u $appUser "--password=$appPwd" --database=$Database --default-character-set=utf8mb4 2>$null
    if ($LASTEXITCODE -ne 0) { throw "清理演示数据失败（mysql 退出码 $LASTEXITCODE）" }
  } finally {
    $ErrorActionPreference = $prev
  }
} finally {
  Remove-Item $sqlFile -Force -ErrorAction SilentlyContinue
}

"已清理测试订单与测试地址；接着可执行 .\scripts\seed-demo-orders.ps1 补演示订单"
