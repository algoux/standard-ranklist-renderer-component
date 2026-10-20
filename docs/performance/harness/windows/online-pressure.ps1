$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
$root = Join-Path $env:TEMP 'srk-performance-20261020'
. (Join-Path $root 'cdp.ps1')
$browser=Invoke-RestMethod 'http://127.0.0.1:9223/json/version'
$existingTargets=Invoke-RestMethod 'http://127.0.0.1:9223/json/list'
$oldPages=@($existingTargets | Where-Object type -eq 'page')
Open-SrkCdp $browser.webSocketDebuggerUrl
try {
    $newTarget=Send-SrkCdp 'Target.createTarget' @{url='about:blank'}
    foreach($old in $oldPages){Send-SrkCdp 'Target.closeTarget' @{targetId=$old.id} | Out-Null}
} finally { Close-SrkCdp }
$existingTargets=Invoke-RestMethod 'http://127.0.0.1:9223/json/list'
$pageTarget=$existingTargets | Where-Object id -eq $newTarget.targetId
Open-SrkCdp $pageTarget.webSocketDebuggerUrl
try {
    Send-SrkCdp 'Page.enable' | Out-Null
    Send-SrkCdp 'Performance.enable' | Out-Null
    Send-SrkCdp 'Emulation.setDeviceMetricsOverride' @{width=1440;height=900;deviceScaleFactor=1;mobile=$false} | Out-Null
    Send-SrkCdp 'Page.addScriptToEvaluateOnNewDocument' @{source='window.__srkWinProbe={longTasks:[],errors:[]};new PerformanceObserver(l=>__srkWinProbe.longTasks.push(...l.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:"longtask",buffered:true});addEventListener("error",e=>__srkWinProbe.errors.push(e.message));'} | Out-Null
    $navigationRequestedUtc=[DateTime]::UtcNow.ToString('o')
    Send-SrkCdp 'Page.navigate' @{url='https://rl.algoux.cn/collection/official?rankId=icpc2026preliminary-1'} | Out-Null
    Start-Sleep -Milliseconds 250
    $ready = Send-SrkCdp 'Runtime.evaluate' @{expression='new Promise(resolve=>{const end=Date.now()+90000;const t=setInterval(()=>{const rows=document.querySelectorAll("tbody tr").length;if(rows>100&&document.readyState==="complete"){clearInterval(t);resolve({ready:true,ms:performance.now(),rows})}else if(Date.now()>end){clearInterval(t);resolve({ready:false,ms:performance.now(),rows})}},100)})';awaitPromise=$true;returnByValue=$true}
    Start-Sleep -Seconds 30
    $document = Send-SrkCdp 'Runtime.evaluate' @{expression='({performanceTimeOrigin:performance.timeOrigin,performanceNow:performance.now(),devtools:{windowKeys:Object.keys(window).filter(k=>/__VUE|DEVTOOLS/.test(k)),hookType:typeof window.__VUE_DEVTOOLS_GLOBAL_HOOK__,hookEnabled:window.__VUE_DEVTOOLS_GLOBAL_HOOK__?.enabled,hookApps:window.__VUE_DEVTOOLS_GLOBAL_HOOK__?.apps?.length},probe:window.__srkWinProbe,title:document.title,url:location.href,elements:document.querySelectorAll("*").length,rows:document.querySelectorAll("tbody tr").length,height:document.documentElement.scrollHeight,bodyText:document.body.innerText.slice(0,500),navigation:performance.getEntriesByType("navigation").map(e=>e.toJSON()),paint:performance.getEntriesByType("paint").map(e=>e.toJSON()),resources:performance.getEntriesByType("resource").filter(e=>e.initiatorType==="fetch"||e.initiatorType==="xmlhttprequest").map(e=>({name:e.name,start:e.startTime,duration:e.duration,transferSize:e.transferSize,decodedBodySize:e.decodedBodySize}))})';returnByValue=$true}
    $metrics=Send-SrkCdp 'Performance.getMetrics'
    $heap=Send-SrkCdp 'Runtime.getHeapUsage'
    $dom=Send-SrkCdp 'Memory.getDOMCounters'
    Send-SrkCdp 'HeapProfiler.collectGarbage' | Out-Null
    $afterGC=Send-SrkCdp 'Runtime.getHeapUsage'
    $afterGCDom=Send-SrkCdp 'Memory.getDOMCounters'
} finally { Close-SrkCdp }
$browser=Invoke-RestMethod 'http://127.0.0.1:9223/json/version'
Open-SrkCdp $browser.webSocketDebuggerUrl
try {
    $processes=(Send-SrkCdp 'SystemInfo.getProcessInfo').processInfo
    $targets=(Send-SrkCdp 'Target.getTargets').targetInfos
    Start-Sleep -Seconds 3
    $processes3sLater=(Send-SrkCdp 'SystemInfo.getProcessInfo').processInfo
} finally { Close-SrkCdp }
$usage=foreach($entry in $processes){$p=Get-Process -Id $entry.id -ErrorAction SilentlyContinue;if($p){[PSCustomObject]@{type=$entry.type;id=$entry.id;workingSetBytes=$p.WorkingSet64;privateBytes=$p.PrivateMemorySize64;cpuTime=$entry.cpuTime}}}
$memory=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory | Select-Object AvailableMBytes,CommittedBytes,CommitLimit,PercentCommittedBytesInUse,PagesPersec,PageReadsPersec,PageWritesPersec
$result=[PSCustomObject]@{browser=$browser.Browser;navigationRequestedUtc=$navigationRequestedUtc;utc=[DateTime]::UtcNow.ToString('o');ready=$ready.result.value;document=$document.result.value;metrics=$metrics;heap=$heap;dom=$dom;afterGC=$afterGC;afterGCDom=$afterGCDom;targets=$targets;processes3sLater=$processes3sLater;processes=$usage;systemMemory=$memory}
$result | ConvertTo-Json -Depth 30 -Compress
$result | ConvertTo-Json -Depth 30 | Set-Content -Encoding UTF8 (Join-Path $root 'windows-online-pressure.json')
Open-SrkCdp $browser.webSocketDebuggerUrl
try {
    Send-SrkCdp 'Target.createTarget' @{url='about:blank'} | Out-Null
    Send-SrkCdp 'Target.closeTarget' @{targetId=$newTarget.targetId} | Out-Null
} finally { Close-SrkCdp }
