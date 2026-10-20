param(
    [Parameter(Mandatory=$true)][string]$RunName,
    [string]$Url = 'http://127.0.0.1:4178/collection/official?rankId=icpc2026preliminary-1',
    [switch]$CheckInteraction
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
$root = $PSScriptRoot
. (Join-Path $root 'cdp.ps1')
$browser = Invoke-RestMethod 'http://127.0.0.1:9223/json/version'
$initialTargets = Invoke-RestMethod 'http://127.0.0.1:9223/json/list'
$oldPages = @($initialTargets | Where-Object type -eq 'page')
Open-SrkCdp $browser.webSocketDebuggerUrl
try {
    $newTarget = Send-SrkCdp 'Target.createTarget' @{ url = 'about:blank' }
    foreach ($old in $oldPages) {
        Send-SrkCdp 'Target.closeTarget' @{ targetId = $old.id } | Out-Null
    }
    $initialProcesses = (Send-SrkCdp 'SystemInfo.getProcessInfo').processInfo
} finally { Close-SrkCdp }
$samplePath = Join-Path $root "$RunName-resources.jsonl"
$stopPath = Join-Path $root "$RunName-stop"
Remove-Item $stopPath -ErrorAction SilentlyContinue
$browserProcessId = ($initialProcesses | Where-Object type -eq 'browser' | Select-Object -First 1).id
$samplerArguments = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}" -OutputPath "{1}" -StopPath "{2}" -BrowserProcessId {3}' -f (Join-Path $root 'p0-resource-sampler.ps1'),$samplePath,$stopPath,$browserProcessId
$sampler = Start-Process powershell.exe -ArgumentList $samplerArguments -PassThru -WindowStyle Hidden
$sampleDeadline = [DateTime]::UtcNow.AddSeconds(20)
while (!(Test-Path $samplePath) -and [DateTime]::UtcNow -lt $sampleDeadline) { Start-Sleep -Milliseconds 100 }
if (!(Test-Path $samplePath)) { throw 'Resource sampler did not start' }
$currentTargets = Invoke-RestMethod 'http://127.0.0.1:9223/json/list'
$pageTarget = $currentTargets | Where-Object id -eq $newTarget.targetId
if (!$pageTarget) { throw "Fresh page target $($newTarget.targetId) not found" }
$probe = [IO.File]::ReadAllText((Join-Path $root 'p0-page-probe.js'))
$navigationUtc = [DateTime]::UtcNow.ToString('o')
try {
    Open-SrkCdp $pageTarget.webSocketDebuggerUrl
    try {
        Send-SrkCdp 'Page.enable' | Out-Null
        Send-SrkCdp 'Performance.enable' | Out-Null
        Send-SrkCdp 'Network.enable' | Out-Null
        Send-SrkCdp 'Network.setCacheDisabled' @{ cacheDisabled = $true } | Out-Null
        Send-SrkCdp 'Emulation.setDeviceMetricsOverride' @{ width=1440; height=900; deviceScaleFactor=1; mobile=$false } | Out-Null
        Send-SrkCdp 'Page.addScriptToEvaluateOnNewDocument' @{ source=$probe } | Out-Null
        Send-SrkCdp 'Page.navigate' @{ url=$Url } | Out-Null
        $ready = Send-SrkCdp 'Runtime.evaluate' @{
            expression = 'new Promise(resolve=>{const end=Date.now()+90000;const t=setInterval(()=>{const p=window.__srkP0Probe;const rows=document.querySelectorAll("tbody tr").length;if(p?.marks.some(m=>m.name==="hydration-and-worker-ready")&&rows===2535&&document.readyState==="complete"){clearInterval(t);resolve({ready:true,ms:performance.now(),rows})}else if(Date.now()>end){clearInterval(t);resolve({ready:false,ms:performance.now(),rows,probe:p})}},100)})'
            awaitPromise=$true; returnByValue=$true
        }
        if ($ready.exceptionDetails) { throw ($ready | ConvertTo-Json -Depth 8 -Compress) }
        Start-Sleep -Seconds 2
        $document = Send-SrkCdp 'Runtime.evaluate' @{
            expression = '({probe:window.__srkP0Probe,title:document.title,url:location.href,elements:document.querySelectorAll("*").length,connectedNodes:(()=>{const walker=document.createTreeWalker(document,NodeFilter.SHOW_ALL);let count=1;while(walker.nextNode())count++;return count})(),retainedSSRRows:Array.from(document.querySelectorAll("tbody tr")).filter(e=>e.__srkP0OriginalSSR).length,rows:document.querySelectorAll("tbody tr").length,height:document.documentElement.scrollHeight,hydrated:document.body.dataset.ranklandHydrated,devKeys:Object.keys(window).filter(k=>/__VUE|DEVTOOLS/.test(k)),navigation:performance.getEntriesByType("navigation").map(e=>e.toJSON()),paint:performance.getEntriesByType("paint").map(e=>e.toJSON()),resources:performance.getEntriesByType("resource").map(e=>({name:e.name,start:e.startTime,duration:e.duration,transferSize:e.transferSize,decodedBodySize:e.decodedBodySize}))})'
            returnByValue=$true
        }
        $metrics = Send-SrkCdp 'Performance.getMetrics'
        $heap = Send-SrkCdp 'Runtime.getHeapUsage'
        $dom = Send-SrkCdp 'Memory.getDOMCounters'
        Send-SrkCdp 'HeapProfiler.collectGarbage' | Out-Null
        $gcHeap = Send-SrkCdp 'Runtime.getHeapUsage'
        $gcDom = Send-SrkCdp 'Memory.getDOMCounters'
        $screenshot = Send-SrkCdp 'Page.captureScreenshot' @{ format='png'; captureBeyondViewport=$false }
        [IO.File]::WriteAllBytes((Join-Path $root "$RunName-page.png"), [Convert]::FromBase64String($screenshot.data))
    } finally { Close-SrkCdp }
    Open-SrkCdp $browser.webSocketDebuggerUrl
    try {
        $processes = (Send-SrkCdp 'SystemInfo.getProcessInfo').processInfo
        $targets = (Send-SrkCdp 'Target.getTargets').targetInfos
    } finally { Close-SrkCdp }
    $usage = @(foreach ($entry in $processes) {
        $process = Get-Process -Id $entry.id -ErrorAction SilentlyContinue
        if ($process) {
            [PSCustomObject]@{ type=$entry.type; id=$entry.id; workingSetBytes=$process.WorkingSet64; privateBytes=$process.PrivateMemorySize64; cpuTime=$entry.cpuTime }
        }
    })
    $memory = Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory | Select-Object AvailableMBytes,CommittedBytes,CommitLimit,PercentCommittedBytesInUse,PagesPersec,PageReadsPersec,PageWritesPersec
    # End resource sampling before optional modal interaction; post-load and interaction are separate measurements.
    [IO.File]::WriteAllText($stopPath, 'stop')
    $interaction = $null
    if ($CheckInteraction -and $ready.result.value.ready) {
        Open-SrkCdp $pageTarget.webSocketDebuggerUrl
        try {
            $intro = Send-SrkCdp 'Runtime.evaluate' @{
                expression = '(()=>{const button=Array.from(document.querySelectorAll("[role=dialog] button")).find(e=>e.textContent.trim()==="OK");if(!button)return null;const r=button.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,text:button.innerText}})()'
                returnByValue=$true
            }
            if ($intro.result.value) {
                $point = $intro.result.value
                Send-SrkCdp 'Input.dispatchMouseEvent' @{ type='mouseMoved'; x=$point.x; y=$point.y } | Out-Null
                Send-SrkCdp 'Input.dispatchMouseEvent' @{ type='mousePressed'; x=$point.x; y=$point.y; button='left'; clickCount=1 } | Out-Null
                Send-SrkCdp 'Input.dispatchMouseEvent' @{ type='mouseReleased'; x=$point.x; y=$point.y; button='left'; clickCount=1 } | Out-Null
                Start-Sleep -Milliseconds 500
            }
            Send-SrkCdp 'Runtime.evaluate' @{ expression='document.querySelector("tbody td.srk-user-cell").scrollIntoView({block:"center",inline:"center"})' } | Out-Null
            Start-Sleep -Milliseconds 300
            $clicked = Send-SrkCdp 'Runtime.evaluate' @{
                expression = '(()=>{const cell=document.querySelector("tbody td.srk-user-cell");const r=cell.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;const hit=document.elementFromPoint(x,y);if(!cell.contains(hit))throw Error("User cell obscured by "+hit?.outerHTML.slice(0,200));return {name:cell.innerText,x,y,ms:performance.now()}})()'
                returnByValue=$true
            }
            if ($clicked.exceptionDetails) { throw ($clicked | ConvertTo-Json -Depth 8 -Compress) }
            $point = $clicked.result.value
            Send-SrkCdp 'Input.dispatchMouseEvent' @{ type='mouseMoved'; x=$point.x; y=$point.y } | Out-Null
            Send-SrkCdp 'Input.dispatchMouseEvent' @{ type='mousePressed'; x=$point.x; y=$point.y; button='left'; clickCount=1 } | Out-Null
            Send-SrkCdp 'Input.dispatchMouseEvent' @{ type='mouseReleased'; x=$point.x; y=$point.y; button='left'; clickCount=1 } | Out-Null
            $chart = Send-SrkCdp 'Runtime.evaluate' @{
                expression = 'new Promise(resolve=>{const end=Date.now()+30000;const t=setInterval(()=>{const modal=document.querySelector(".user-modal");const canvas=modal?.querySelector("canvas");const select=__srkP0Probe.workerEvents.filter(e=>e.kind==="select"&&e.type==="response").at(-1);if(modal&&canvas&&canvas.width>0&&select){clearInterval(t);resolve({ready:true,ms:performance.now(),modalText:modal.innerText,canvas:{width:canvas.width,height:canvas.height},select})}else if(Date.now()>end){clearInterval(t);resolve({ready:false,modal:!!modal,canvas:!!canvas,select})}},100)})'
                awaitPromise=$true; returnByValue=$true
            }
            Start-Sleep -Seconds 3
            $chartScreenshot = Send-SrkCdp 'Page.captureScreenshot' @{ format='png'; captureBeyondViewport=$false }
            [IO.File]::WriteAllBytes((Join-Path $root "$RunName-chart.png"), [Convert]::FromBase64String($chartScreenshot.data))
            Send-SrkCdp 'Input.dispatchKeyEvent' @{ type='keyDown'; key='Escape'; code='Escape'; windowsVirtualKeyCode=27 } | Out-Null
            Send-SrkCdp 'Input.dispatchKeyEvent' @{ type='keyUp'; key='Escape'; code='Escape'; windowsVirtualKeyCode=27 } | Out-Null
            Start-Sleep -Milliseconds 500
            $closed = Send-SrkCdp 'Runtime.evaluate' @{
                expression = '({modalOpen:!!document.querySelector(".user-modal"),rows:document.querySelectorAll("tbody tr").length,errors:__srkP0Probe.errors,workerEvents:__srkP0Probe.workerEvents})'
                returnByValue=$true
            }
            $interaction = [PSCustomObject]@{ introDismissed=$intro.result.value; clicked=$clicked.result.value; chart=$chart.result.value; afterClose=$closed.result.value }
        } finally { Close-SrkCdp }
    }
    $result = [PSCustomObject]@{
        name=$RunName; browser=$browser.Browser; navigationUtc=$navigationUtc; endUtc=[DateTime]::UtcNow.ToString('o')
        ready=$ready.result.value; document=$document.result.value
        metrics=$metrics; beforeGC=@{ heap=$heap; dom=$dom }; afterGC=@{ heap=$gcHeap; dom=$gcDom }
        initialProcesses=$initialProcesses; processes=$usage; targets=$targets; systemMemory=$memory; interaction=$interaction
    }
    $result | ConvertTo-Json -Depth 30 | Set-Content -Encoding UTF8 (Join-Path $root "$RunName.json")
    [PSCustomObject]@{
        run=$RunName; ready=$ready.result.value; rows=$document.result.value.rows
        longestTask=($document.result.value.probe.longTasks | Measure-Object duration -Maximum).Maximum
        gcHeapBytes=$gcHeap.usedSize; gcDom=$gcDom; interaction=$interaction
    } | ConvertTo-Json -Depth 15 -Compress
} finally {
    [IO.File]::WriteAllText($stopPath, 'stop')
    Open-SrkCdp $browser.webSocketDebuggerUrl
    try {
        Send-SrkCdp 'Target.createTarget' @{ url='about:blank' } | Out-Null
        Send-SrkCdp 'Target.closeTarget' @{ targetId=$newTarget.targetId } | Out-Null
    } finally { Close-SrkCdp }
}
