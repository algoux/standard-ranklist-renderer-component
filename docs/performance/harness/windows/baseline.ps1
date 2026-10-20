$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = Join-Path $env:TEMP 'srk-performance-20261020'
. (Join-Path $root 'cdp.ps1')
$results = @()
foreach ($count in @(100,2535)) {
    Open-SrkCdp
    try {
        Send-SrkCdp 'Page.enable' | Out-Null
        Send-SrkCdp 'Performance.enable' | Out-Null
        Send-SrkCdp 'Emulation.setDeviceMetricsOverride' @{width=1440;height=900;deviceScaleFactor=1;mobile=$false} | Out-Null
        Send-SrkCdp 'Page.navigate' @{url="http://127.0.0.1:4178/?rows=$count&reactive=raw"} | Out-Null
        Start-Sleep -Milliseconds 250
        $ready = Send-SrkCdp 'Runtime.evaluate' @{expression='new Promise((resolve,reject)=>{const end=Date.now()+90000;const t=setInterval(()=>{if(window.probe?.ready){clearInterval(t);resolve(true)}else if(Date.now()>end){clearInterval(t);reject(new Error("probe timeout"))}},100)})';awaitPromise=$true;returnByValue=$true}
        if ($ready.exceptionDetails) { throw ($ready | ConvertTo-Json -Depth 10 -Compress) }
        Start-Sleep -Milliseconds 1000
        $load = Send-SrkCdp 'Runtime.evaluate' @{expression='({marks:probe.marks,events:probe.events,longTasks:probe.longTasks,elements:document.querySelectorAll("*").length,rows:document.querySelectorAll("tbody tr").length,height:document.documentElement.scrollHeight,width:innerWidth,viewportHeight:innerHeight})';returnByValue=$true}
        $metrics = Send-SrkCdp 'Performance.getMetrics'
        $heap = Send-SrkCdp 'Runtime.getHeapUsage'
        $dom = Send-SrkCdp 'Memory.getDOMCounters'
        $preGC = [PSCustomObject]@{metrics=$metrics;heap=$heap;dom=$dom}
        Send-SrkCdp 'HeapProfiler.collectGarbage' | Out-Null
        $gcHeap = Send-SrkCdp 'Runtime.getHeapUsage'
        $gcDom = Send-SrkCdp 'Memory.getDOMCounters'
    } finally { Close-SrkCdp }
    $browser = Invoke-RestMethod 'http://127.0.0.1:9223/json/version'
    Open-SrkCdp $browser.webSocketDebuggerUrl
    try { $processes = (Send-SrkCdp 'SystemInfo.getProcessInfo').processInfo } finally { Close-SrkCdp }
    $usage = foreach ($entry in $processes) {
        $process = Get-Process -Id $entry.id -ErrorAction SilentlyContinue
        if ($process) { [PSCustomObject]@{type=$entry.type;id=$entry.id;workingSetBytes=$process.WorkingSet64;privateBytes=$process.PrivateMemorySize64;cpuTime=$entry.cpuTime} }
    }
    $memory = Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory | Select-Object AvailableMBytes,CommittedBytes,CommitLimit,PercentCommittedBytesInUse,PagesPersec,PageReadsPersec,PageWritesPersec
    $result = [PSCustomObject]@{rows=$count;browser=$browser.Browser;utc=[DateTime]::UtcNow.ToString('o');load=$load.result.value;beforeGC=$preGC;afterGC=@{heap=$gcHeap;dom=$gcDom};processes=$usage;systemMemory=$memory}
    $results += $result
    $result | ConvertTo-Json -Depth 20 -Compress
}
$results | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 (Join-Path $root 'windows-baseline.json')
Open-SrkCdp
try { Send-SrkCdp 'Page.navigate' @{url='about:blank'} | Out-Null; Send-SrkCdp 'HeapProfiler.collectGarbage' | Out-Null } finally { Close-SrkCdp }
