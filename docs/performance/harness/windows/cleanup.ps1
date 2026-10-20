$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
$root=Join-Path $env:TEMP 'srk-performance-20261020'
$owned=Get-Content (Join-Path $root 'processes.json') -Raw | ConvertFrom-Json
$browserProcess=Get-CimInstance Win32_Process -Filter ('ProcessId=' + $owned.EdgeProcessId)
if($browserProcess){
    if($browserProcess.Name -ne 'msedge.exe' -or $browserProcess.CommandLine -notlike ('*--user-data-dir=' + $root + '\edge-profile*')){throw 'Browser PID does not match our isolated profile; refusing cleanup'}
    . (Join-Path $root 'cdp.ps1')
    $browser=Invoke-RestMethod 'http://127.0.0.1:9223/json/version'
    Open-SrkCdp $browser.webSocketDebuggerUrl
    try {
        Send-SrkCdp 'Browser.close' | Out-Null
    } catch {
        if($_.Exception.Message -notmatch 'closed|remote party|WebSocket|ReceiveAsync'){throw}
    } finally {Close-SrkCdp}
}
$serverProcess=Get-CimInstance Win32_Process -Filter ('ProcessId=' + $owned.ServerProcessId)
if($serverProcess){
    if($serverProcess.Name -ne 'powershell.exe' -or $serverProcess.CommandLine -notlike ('*' + $root + '\server.ps1*')){throw 'Server PID does not match our localhost server; refusing cleanup'}
    Stop-Process -Id $owned.ServerProcessId
}
Start-Sleep -Seconds 1
$ports=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object LocalPort -in @(4178,9223) | Select-Object LocalAddress,LocalPort,OwningProcess)
$pressureId=[int](Get-Content (Join-Path $root 'pressure.pid'))
$pressure=Get-CimInstance Win32_Process -Filter ('ProcessId=' + $pressureId)
$remainingOwned=@(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like ('*' + $root + '\edge-profile*') -or $_.CommandLine -like ('*' + $root + '\server.ps1*') -or $_.CommandLine -like ('*' + $root + '\pressure.ps1*') } | Select-Object ProcessId,Name,CommandLine)
$result=[PSCustomObject]@{utc=[DateTime]::UtcNow.ToString('o');listeningTestPorts=$ports;pressurePid=$pressureId;pressurePidExists=[bool]$pressure;remainingOwnedProcesses=$remainingOwned;temporaryFilesPreserved=(Test-Path $root)}
$result | ConvertTo-Json -Depth 10 -Compress
$result | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 (Join-Path $root 'cleanup-state.json')
if($ports.Count -ne 0 -or $remainingOwned.Count -ne 0 -or $pressure){throw 'Cleanup verification did not pass'}
