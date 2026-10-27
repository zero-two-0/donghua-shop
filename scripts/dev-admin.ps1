# 启动管理端 Web 开发服务器（默认 http://127.0.0.1:5174，Mock 模式）
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location (Join-Path $root 'code\frontend')
try {
    & ..\tools\pnpm\node_modules\.bin\pnpm.cmd --filter admin-web dev
} finally {
    Pop-Location
}
