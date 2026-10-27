# 停止 start-all 启动的服务：按端口结束进程（后端 8080、用户端 5173、管理端 5174）
param(
    [int[]]$Ports = @(8080, 5173, 5174)
)

$ErrorActionPreference = 'Continue'
$stopped = @()

foreach ($port in $Ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $conns) { Write-Host "  端口 $port 无监听，跳过" -ForegroundColor DarkGray; continue }
    $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $pids) {
        $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($p) {
            $name = $p.ProcessName
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            # dev server 往往是 pnpm → node 子进程，父进程结束后再兜底清掉它的子进程
            Get-CimInstance Win32_Process -Filter "ParentProcessId=$procId" -ErrorAction SilentlyContinue |
                ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
            $stopped += "$port($name#$procId)"
            Write-Host "  已停止 端口 $port → $name (PID $procId)" -ForegroundColor Yellow
        }
    }
}

if ($stopped.Count -eq 0) { Write-Host '  没有需要停止的服务。' -ForegroundColor Green }
else { Write-Host ("  已停止：" + ($stopped -join ', ')) -ForegroundColor Green }
