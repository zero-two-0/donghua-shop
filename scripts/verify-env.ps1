# 环境自检：输出一张 PASS/FAIL 表，全部通过返回 0。
# 用法：. .\scripts\env.ps1 ; .\scripts\verify-env.ps1
# 说明：java -version / mvn -v 会把信息写到 stderr，PowerShell 5.1 在 ErrorActionPreference=Stop 下
#       会把它当成终止错误，因此统一用 cmd /c 包裹，只取 stdout。
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not $Env:DH_ROOT) { . (Join-Path $PSScriptRoot 'env.ps1') }

$rows = @()
function Add-Row($item, $expected, $actual, $ok) {
    $script:rows += [pscustomobject]@{
        项目 = $item; 期望 = $expected; 实际 = $actual; 结果 = $(if ($ok) { 'PASS' } else { 'FAIL' })
    }
}

function Invoke-Capture([string]$exe, [string]$arguments) {
    $out = & cmd /c "`"$exe`" $arguments 2>&1"
    return (($out | Out-String).Trim())
}

# ---- JDK ----
try {
    $v = Invoke-Capture (Join-Path $Env:JAVA_HOME 'bin\java.exe') '-version'
    $first = ($v -split "`r?`n" | Where-Object { $_ -match 'version' } | Select-Object -First 1)
    Add-Row 'JDK（便携）' '17.x' $first.Trim() ($v -match 'version "17')
} catch { Add-Row 'JDK（便携）' '17.x' $_.Exception.Message $false }

# ---- Maven ----
try {
    $v = Invoke-Capture (Join-Path $Env:MAVEN_HOME 'bin\mvn.cmd') '-v'
    $mavenLine = ($v -split "`r?`n" | Where-Object { $_ -match 'Apache Maven' } | Select-Object -First 1)
    $jdkLine = ($v -split "`r?`n" | Where-Object { $_ -match 'Java version' } | Select-Object -First 1)
    Add-Row 'Maven' '3.9.x' $mavenLine.Trim() ($v -match 'Apache Maven 3\.9')
    Add-Row 'Maven 运行时 JDK' '17.x' $jdkLine.Trim() ($v -match 'Java version: 17')
} catch { Add-Row 'Maven' '3.9.x' $_.Exception.Message $false }

# ---- Node / pnpm ----
try {
    $v = (Invoke-Capture 'node' '-v')
    Add-Row 'Node.js' '>=18' $v ([version]($v.TrimStart('v')) -ge [version]'18.0.0')
} catch { Add-Row 'Node.js' '>=18' $_.Exception.Message $false }

try {
    $v = (Invoke-Capture $Env:DH_PNPM '--version')
    Add-Row 'pnpm（便携）' '10.x' $v ($v -match '^10\.')
} catch { Add-Row 'pnpm（便携）' '10.x' $_.Exception.Message $false }

# ---- MySQL 服务与库 ----
try {
    $svc = Get-Service -Name 'MySQL80' -ErrorAction Stop
    Add-Row 'MySQL 服务' 'Running' $svc.Status ($svc.Status -eq 'Running')
} catch { Add-Row 'MySQL 服务' 'Running' '未找到服务 MySQL80' $false }

try {
    # 正式课程库：takeout_course（组长 docs/leader/week2/schema.sql 建库），应用账号 sky_app
    $env:MYSQL_PWD = $Env:SKY_DB_APP_PASSWORD
    $q = & $Env:DH_MYSQL -h 127.0.0.1 -P 3306 -u sky_app takeout_course `
        --default-character-set=utf8mb4 -N -e "SELECT CONCAT((SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='takeout_course'), ' 张表 / ', (SELECT COUNT(*) FROM dish), ' 菜品 / ', (SELECT COUNT(*) FROM orders), ' 订单 / ', (SELECT COUNT(*) FROM employee), ' 员工');" 2>&1
    $code = $LASTEXITCODE
    $env:MYSQL_PWD = $null
    $text = ($q | Out-String).Trim()
    Add-Row '数据库 takeout_course' '可读写且含种子数据' $text (($code -eq 0) -and ($text -match '张表'))
} catch { $env:MYSQL_PWD = $null; Add-Row '数据库 takeout_course' '可读写且含种子数据' $_.Exception.Message $false }

# ---- 前端工程 ----
foreach ($app in 'user-h5', 'admin-web') {
    $dir = Join-Path $root "code\frontend\$app"
    $hasPkg = Test-Path (Join-Path $dir 'package.json')
    $hasDist = Test-Path (Join-Path $dir 'dist\index.html')
    Add-Row "前端 $app" 'package.json + dist/index.html' "pkg=$hasPkg dist=$hasDist" ($hasPkg -and $hasDist)
}

# ---- 后端（信息项，不计入失败）：是否已启动并可返回契约外壳 ----
try {
    $out = (& node -e "fetch('http://127.0.0.1:8080/user/shop/status').then(r=>r.json()).then(j=>console.log('code='+j.code+' data='+j.data)).catch(e=>console.log('down'))" 2>&1 | Out-String).Trim()
    if ($out -match 'code=1') {
        Add-Row '后端服务 8080' 'code=1（可选）' $out $true
    } else {
        Add-Row '后端服务 8080' '未启动（可选，不影响工具链自检）' $out $true
    }
} catch { Add-Row '后端服务 8080' '未启动（可选）' $_.Exception.Message $true }

# ---- 后端 JAR ----
$jar = Join-Path $root 'code\backend\sky-server\target\sky-server-1.0-SNAPSHOT.jar'
Add-Row '后端构建产物' 'sky-server JAR 存在' $(if (Test-Path $jar) { 'yes' } else { 'no（执行 mvn package）' }) (Test-Path $jar)

$rows | Format-Table -AutoSize | Out-String -Width 220 | Write-Host
$fail = @($rows | Where-Object { $_.结果 -eq 'FAIL' }).Count
if ($fail -gt 0) {
    Write-Host "环境自检未通过：$fail 项失败。" -ForegroundColor Red
    exit 1
}
Write-Host '环境自检全部通过。' -ForegroundColor Green
exit 0
