# 启动用户端 H5 开发服务器（默认 http://127.0.0.1:5173，Mock 模式）
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location (Join-Path $root 'code\frontend')
try {
    & ..\tools\pnpm\node_modules\.bin\pnpm.cmd --filter user-h5 dev
} finally {
    Pop-Location
}
