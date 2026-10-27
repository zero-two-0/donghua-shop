# 项目环境解析脚本：为当前 PowerShell 会话注入便携工具链。
# 用法（在项目根目录）：  . .\scripts\env.ps1
# 注意：只影响当前会话，不修改系统 PATH / JAVA_HOME。

$script:ProjectRoot = Split-Path -Parent $PSScriptRoot

$Env:DH_ROOT       = $script:ProjectRoot
$Env:JAVA_HOME     = Join-Path $script:ProjectRoot 'tools\jdk17'
$Env:MAVEN_HOME    = Join-Path $script:ProjectRoot 'tools\apache-maven-3.9.9'
$Env:DH_PNPM       = Join-Path $script:ProjectRoot 'tools\pnpm\node_modules\.bin\pnpm.cmd'
$Env:DH_MYSQL      = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe'

# 数据库连接参数（密码不写进仓库，放在 config\env.local.ps1，已被 .gitignore 忽略）
$localCfg = Join-Path $script:ProjectRoot 'config\env.local.ps1'
if (Test-Path $localCfg) { . $localCfg }
if (-not $Env:DH_DB_PASSWORD) { $Env:DH_DB_PASSWORD = '' }

$Env:DH_DB_HOST = if ($Env:DH_DB_HOST) { $Env:DH_DB_HOST } else { '127.0.0.1' }
$Env:DH_DB_PORT = if ($Env:DH_DB_PORT) { $Env:DH_DB_PORT } else { '3306' }
$Env:DH_DB_NAME = 'donghua_shop'
$Env:DH_DB_USER = 'dh_shop'
$Env:DH_DB_ROOT_USER = 'root'
# 口令一律来自 config\env.local.ps1（.gitignore 已排除），仓库内不保存真实口令
if (-not $Env:DH_DB_APP_PASSWORD)    { $Env:DH_DB_APP_PASSWORD = '' }     # 旧草案库 donghua_shop
if (-not $Env:SKY_DB_APP_PASSWORD)   { $Env:SKY_DB_APP_PASSWORD = '' }    # 课程库 takeout_course（sky_app）
if (-not $Env:COURSE_ADMIN_PASSWORD) { $Env:COURSE_ADMIN_PASSWORD = '' }  # 首次启动后端创建 admin

# 前置检查：缺少关键工具时给出可执行的修复提示，而不是让后续命令报晦涩错误
if (-not (Test-Path (Join-Path $Env:JAVA_HOME 'bin\java.exe'))) {
    throw "未找到便携 JDK 17：$Env:JAVA_HOME。请先运行 .\scripts\setup-env.ps1 -WithJdk"
}
if (-not (Test-Path (Join-Path $Env:MAVEN_HOME 'bin\mvn.cmd'))) {
    throw "未找到 Maven：$Env:MAVEN_HOME。请先运行 .\scripts\setup-env.ps1 -WithMaven"
}
if (-not (Test-Path $Env:DH_PNPM)) {
    throw "未找到 pnpm：$Env:DH_PNPM。请先运行 .\scripts\setup-env.ps1 -WithPnpm"
}
if (-not (Test-Path $Env:DH_MYSQL)) {
    throw "未找到 mysql 客户端：$Env:DH_MYSQL。请确认已安装 MySQL Server 8.0。"
}

# 把 JDK 17 与 Maven 放到会话 PATH 最前面，避免被系统里的 JDK 1.8 / JDK 25 抢走
$env:Path = "$Env:JAVA_HOME\bin;$Env:MAVEN_HOME\bin;$env:Path"
$env:MAVEN_OPTS = '-Dfile.encoding=UTF-8'
# 不设置 JAVA_TOOL_OPTIONS：它会为每次 java 调用打印 "Picked up ..." 噪声，干扰脚本输出解析

Write-Host "[env] JAVA_HOME = $Env:JAVA_HOME" -ForegroundColor DarkGray
Write-Host "[env] MAVEN_HOME = $Env:MAVEN_HOME" -ForegroundColor DarkGray
Write-Host "[env] DB = $Env:DH_DB_USER@$($Env:DH_DB_HOST):$($Env:DH_DB_PORT)/$($Env:DH_DB_NAME)" -ForegroundColor DarkGray
