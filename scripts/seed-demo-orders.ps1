# 生成“像真实营业过一段时间”的演示订单
# 用法：.\scripts\seed-demo-orders.ps1
# 幂等：先删两个演示用户近 6 天的订单再插入；订单号用 32 位十六进制，与真实下单一致
[CmdletBinding()]
param([string]$Database = 'takeout_course')

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'env.ps1') | Out-Null

$appUser = $env:SKY_DB_APP_USER
$appPwd = $env:SKY_DB_APP_PASSWORD
if (-not $appUser) { $appUser = 'sky_app' }
if (-not $appPwd) { throw '缺少数据库应用口令：请先在 config/env.local.ps1 配置 SKY_DB_APP_PASSWORD' }

$mysql = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe'
if (-not (Test-Path $mysql)) {
  $cmd = Get-Command mysql.exe -ErrorAction SilentlyContinue
  if (-not $cmd) { throw '找不到 mysql.exe，请确认 MySQL 已安装' }
  $mysql = $cmd.Source
}

function Now-Offset([int]$days, [int]$hour, [int]$minute) {
  (Get-Date).Date.AddDays(-$days).AddHours($hour).AddMinutes($minute).ToString('yyyy-MM-dd HH:mm:ss')
}

$t4 = Now-Offset 4 11 42
$t3 = Now-Offset 3 12 10
$t2 = Now-Offset 2 18 5
$t1 = Now-Offset 1 11 55
$t0a = Now-Offset 0 11 30
$t0b = Now-Offset 0 12 2

$num = @{}
foreach ($k in 1..6) { $num[$k] = [guid]::NewGuid().ToString('N') }

$sql = @"
SET NAMES utf8mb4;
DELETE FROM orders WHERE user_id IN (1,2) AND number REGEXP '^[0-9a-f]{32}$' AND order_time >= (CURDATE() - INTERVAL 6 DAY);
DELETE FROM order_detail WHERE order_id NOT IN (SELECT id FROM orders);

INSERT INTO orders (number,status,user_id,address_book_id,order_time,checkout_time,pay_method,pay_status,amount,remark,user_name,phone,address,consignee,estimated_delivery_time,delivery_status,delivery_time,pack_amount,tableware_number,cancel_reason,cancel_time)
VALUES
 ('$($num[1])',5,1,1,'$t4','$t4',1,1,30.00,'少放辣','陈子涵','13800001234','上海市松江区东华大学 12 号宿舍楼 305','陈子涵','$t4',2,'$t4',0,0,NULL,NULL),
 ('$($num[2])',5,1,1,'$t3','$t3',1,1,40.00,NULL,'陈子涵','13800001234','上海市松江区东华大学 12 号宿舍楼 305','陈子涵','$t3',2,'$t3',0,0,NULL,NULL),
 ('$($num[3])',6,1,1,'$t2','$t2',1,1,18.00,'临时有事','陈子涵','13800001234','上海市松江区东华大学 12 号宿舍楼 305','陈子涵',NULL,NULL,NULL,0,0,'临时有事','$t2'),
 ('$($num[4])',5,1,1,'$t1','$t1',1,1,48.00,'打包带走','陈子涵','13800001234','上海市松江区东华大学 12 号宿舍楼 305','陈子涵','$t1',2,'$t1',0,0,NULL,NULL),
 ('$($num[5])',5,1,1,'$t0a','$t0a',1,1,12.00,NULL,'陈子涵','13800001234','上海市松江区东华大学 12 号宿舍楼 305','陈子涵','$t0a',2,'$t0a',0,0,NULL,NULL),
 ('$($num[6])',4,2,2,'$t0b','$t0b',1,1,28.00,'不要香菜','林书瑶','13900005678','上海市松江区东华大学 8 号宿舍楼 212','林书瑶','$t0b',1,NULL,0,0,NULL,NULL);

INSERT INTO order_detail (name,order_id,dish_id,setmeal_id,dish_flavor,number,amount,image)
SELECT '宫保鸡丁', id, 1, NULL, '["不辣","微辣"]', 1, 18.00, '/assets/dish-1.svg' FROM orders WHERE number = '$($num[1])';
INSERT INTO order_detail (name,order_id,dish_id,setmeal_id,dish_flavor,number,amount,image)
SELECT '番茄炒蛋', id, 2, NULL, NULL, 1, 12.00, '/assets/dish-2.svg' FROM orders WHERE number = '$($num[1])';
INSERT INTO order_detail (name,order_id,dish_id,setmeal_id,dish_flavor,number,amount,image)
SELECT '双人套餐', id, NULL, 1, NULL, 1, 28.00, '/assets/setmeal-1.svg' FROM orders WHERE number = '$($num[2])';
INSERT INTO order_detail (name,order_id,dish_id,setmeal_id,dish_flavor,number,amount,image)
SELECT '番茄炒蛋', id, 2, NULL, NULL, 1, 12.00, '/assets/dish-2.svg' FROM orders WHERE number = '$($num[2])';
INSERT INTO order_detail (name,order_id,dish_id,setmeal_id,dish_flavor,number,amount,image)
SELECT '宫保鸡丁', id, 1, NULL, NULL, 1, 18.00, '/assets/dish-1.svg' FROM orders WHERE number = '$($num[3])';
INSERT INTO order_detail (name,order_id,dish_id,setmeal_id,dish_flavor,number,amount,image)
SELECT '宫保鸡丁', id, 1, NULL, '["不辣"]', 2, 18.00, '/assets/dish-1.svg' FROM orders WHERE number = '$($num[4])';
INSERT INTO order_detail (name,order_id,dish_id,setmeal_id,dish_flavor,number,amount,image)
SELECT '番茄炒蛋', id, 2, NULL, NULL, 1, 12.00, '/assets/dish-2.svg' FROM orders WHERE number = '$($num[4])';
INSERT INTO order_detail (name,order_id,dish_id,setmeal_id,dish_flavor,number,amount,image)
SELECT '番茄炒蛋', id, 2, NULL, NULL, 1, 12.00, '/assets/dish-2.svg' FROM orders WHERE number = '$($num[5])';
INSERT INTO order_detail (name,order_id,dish_id,setmeal_id,dish_flavor,number,amount,image)
SELECT '双人套餐', id, NULL, 1, NULL, 1, 28.00, '/assets/setmeal-1.svg' FROM orders WHERE number = '$($num[6])';
"@

$sqlFile = Join-Path $env:TEMP ("seed-demo-" + [guid]::NewGuid().ToString('N') + ".sql")
[System.IO.File]::WriteAllText($sqlFile, $sql, (New-Object System.Text.UTF8Encoding($false)))
try {
  # mysql 会把口令告警写到 stderr，PowerShell 5.1 在 Stop 模式下会当成终止错误
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    Get-Content $sqlFile -Raw -Encoding UTF8 | & $mysql --protocol=TCP -h 127.0.0.1 -P 3306 -u $appUser "--password=$appPwd" --database=$Database --default-character-set=utf8mb4 2>$null
    if ($LASTEXITCODE -ne 0) { throw "写入演示订单失败（mysql 退出码 $LASTEXITCODE）" }
  } finally {
    $ErrorActionPreference = $prev
  }
} finally {
  Remove-Item $sqlFile -Force -ErrorAction SilentlyContinue
}

"演示订单已写入：6 条（明细 9 行），订单号为 32 位十六进制"
