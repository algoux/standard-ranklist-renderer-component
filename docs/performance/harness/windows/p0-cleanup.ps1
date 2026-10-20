$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
$root = $PSScriptRoot
. (Join-Path $root 'cdp.ps1')
$prepared = Get-Content (Join-Path $root 'p0-prepared-state.json') -Raw | ConvertFrom-Json
$browserProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($prepared.browserPid)"
if ($browserProcess -and $browserProcess.CommandLine -notlike "*$root\edge-profile*") {
    throw 'Isolated browser identity changed; refusing cleanup'
}
$browser = Invoke-RestMethod 'http://127.0.0.1:9223/json/version'
Open-SrkCdp $browser.webSocketDebuggerUrl
try {
    try { Send-SrkCdp 'Browser.close' | Out-Null } catch {
        # Edge may close the socket before acknowledging Browser.close.
        if ($_.Exception.Message -notmatch 'closed|Aborted|WebSocket|远程|关闭') { throw }
    }
} finally { Close-SrkCdp }
$serverProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($prepared.serverPid)"
if ($serverProcess) {
    if ($serverProcess.Name -ne 'powershell.exe' -or $serverProcess.CommandLine -notlike "*$root\p0-server.ps1*") {
        throw 'Isolated server identity changed; refusing cleanup'
    }
    Stop-Process -Id $prepared.serverPid
}
$deadline = [DateTime]::UtcNow.AddSeconds(10)
do {
    Start-Sleep -Milliseconds 250
    $listeners = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object LocalPort -in 4178,4322,9223)
} while ($listeners.Count -gt 0 -and [DateTime]::UtcNow -lt $deadline)
$remaining = @(Get-CimInstance Win32_Process | Where-Object {
    $_.ProcessId -ne $PID -and (
        $_.CommandLine -like "*$root\edge-profile*" -or
        $_.CommandLine -like "*$root\p0-server.ps1*" -or
        $_.CommandLine -like "*$root\p0-resource-sampler.ps1*"
    )
} | Select-Object ProcessId,Name,CommandLine)
$result = [PSCustomObject]@{
    utc = [DateTime]::UtcNow.ToString('o')
    listeners = @($listeners | Select-Object LocalAddress,LocalPort,OwningProcess)
    remainingProcesses = $remaining
    memory = Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory | Select-Object AvailableMBytes,CommittedBytes,CommitLimit,PercentCommittedBytesInUse
}
$result | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 (Join-Path $root 'p0-windows-cleanup-state.json')
$result | ConvertTo-Json -Depth 10
if ($listeners.Count -or $remaining.Count) { throw 'Isolated test cleanup was incomplete' }
