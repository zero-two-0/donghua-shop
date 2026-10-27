# 一次性环境搭建脚本（可重复执行，已存在的组件会跳过）
# 用法：
#   .\scripts\setup-env.ps1                 # 校验并补齐全部组件
#   .\scripts\setup-env.ps1 -WithJdk -WithMaven -WithPnpm
#   .\scripts\setup-env.ps1 -WithDb          # 额外建库、建账号、导入表结构与种子数据
param(
    [switch]$WithJdk,
    [switch]$WithMaven,
    [switch]$WithPnpm,
    [switch]$WithDb,
    [switch]$All
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if ($All) { $WithJdk = $WithMaven = $WithPnpm = $WithDb = $true }

$jdkDir   = Join-Path $root 'tools\jdk17'
$mavenDir = Join-Path $root 'tools\apache-maven-3.9.9'
$pnpmCmd  = Join-Path $root 'tools\pnpm\node_modules\.bin\pnpm.cmd'
$jdkUrl   = 'https://mirrors.tuna.tsinghua.edu.cn/Adoptium/17/jdk/x64/windows/OpenJDK17U-jdk_x64_windows_hotspot_17.0.20.1_1.zip'
$fetchJs  = Join-Path $root 'tools\fetch.js'

function Write-Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Skip($msg) { Write-Host "    --  $msg" -ForegroundColor DarkGray }

Write-Step '检查 Node.js'
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw '未找到 node.exe。前端构建需要 Node.js 18+，请先安装（https://nodejs.org）。' }
Write-Ok "node $(node -v)"

if ($WithJdk) {
    Write-Step '准备便携 JDK 17'
    if (Test-Path (Join-Path $jdkDir 'bin\java.exe')) {
        Write-Skip "已存在：$jdkDir"
    } else {
        $zip = Join-Path $root 'tools\dist\jdk17.zip'
        Write-Host "    下载 $jdkUrl" -ForegroundColor DarkGray
        & node $fetchJs get $jdkUrl $zip
        if ($LASTEXITCODE -ne 0) { throw 'JDK 下载失败。可手动下载后解压到 tools\jdk17。' }
        Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $root 'tools\_unzip') -Force
        $inner = Get-ChildItem (Join-Path $root 'tools\_unzip') -Directory | Select-Object -First 1
        Move-Item -LiteralPath $inner.FullName -Destination $jdkDir
        Remove-Item -LiteralPath (Join-Path $root 'tools\_unzip') -Recurse -Force
        Remove-Item -LiteralPath $zip -Force
        Write-Ok 'JDK 17 已解压到 tools\jdk17'
    }
}

if ($WithMaven) {
    Write-Step '准备 Maven 3.9.9'
    if (Test-Path (Join-Path $mavenDir 'bin\mvn.cmd')) {
        Write-Skip "已存在：$mavenDir"
    } else {
        $srcMaven = 'D:\Java\apache-maven-3.9.9'
        if (Test-Path (Join-Path $srcMaven 'bin\mvn.cmd')) {
            Copy-Item -LiteralPath $srcMaven -Destination $mavenDir -Recurse -Force
            Write-Ok "已从本机 $srcMaven 复制"
        } else {
            $url = 'https://mirrors.tuna.tsinghua.edu.cn/apache/maven/maven-3/3.9.9/binaries/apache-maven-3.9.9-bin.zip'
            $zip = Join-Path $root 'tools\dist\maven.zip'
            & node $fetchJs get $url $zip
            if ($LASTEXITCODE -ne 0) { throw 'Maven 下载失败。' }
            Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $root 'tools\_unzip') -Force
            Move-Item -LiteralPath (Join-Path $root 'tools\_unzip\apache-maven-3.9.9') -Destination $mavenDir
            Remove-Item -LiteralPath (Join-Path $root 'tools\_unzip') -Recurse -Force
            Remove-Item -LiteralPath $zip -Force
            Write-Ok 'Maven 已解压到 tools\apache-maven-3.9.9'
        }
    }
    # 使用阿里云镜像与项目内本地仓库，避免每次全量拉取中央仓库
    $settings = Join-Path $mavenDir 'conf\settings.xml'
    $mirror = @'
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0">
  <localRepository>${localRepository}</localRepository>
  <mirrors>
    <mirror>
      <id>aliyun</id>
      <mirrorOf>central</mirrorOf>
      <name>Aliyun Central</name>
      <url>https://maven.aliyun.com/repository/public</url>
    </mirror>
  </mirrors>
</settings>
'@ -replace '\$\{localRepository\}', (Join-Path $root 'tools\m2-repository')
    if (-not (Test-Path $settings) -or -not (Select-String -Path $settings -Pattern 'aliyun' -Quiet)) {
        Set-Content -LiteralPath $settings -Value $mirror -Encoding utf8
        Write-Ok '已写入阿里云镜像 settings.xml'
    } else { Write-Skip 'settings.xml 已含阿里云镜像' }
}

if ($WithPnpm) {
    Write-Step '准备 pnpm'
    if (Test-Path $pnpmCmd) {
        Write-Skip "已存在：$pnpmCmd"
    } else {
        Push-Location $root
        npm install --prefix tools\pnpm --cache tools\npm-cache --no-fund --no-audit `
            --registry https://registry.npmmirror.com pnpm@10
        if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'pnpm 安装失败。' }
        Pop-Location
        Write-Ok 'pnpm 已安装到 tools\pnpm'
    }
}

if ($WithDb) {
    Write-Step '初始化 MySQL 数据库'
    & (Join-Path $PSScriptRoot 'db-init.ps1')
    if ($LASTEXITCODE -ne 0) { throw '数据库初始化失败，请查看上方输出。' }
}

Write-Step '完成。下一步：. .\scripts\env.ps1 ; .\scripts\verify-env.ps1'
