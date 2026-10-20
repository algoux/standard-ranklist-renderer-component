param([int]$Seconds=120, [int]$MemoryMiB=1024)
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$root=Join-Path $env:TEMP 'srk-performance-20261020'
Add-Type -Path (Join-Path $root 'SrkBoundedPressure.dll')
[SrkBoundedPressure]::Run(
    (Join-Path $root 'pressure.jsonl'),
    (Join-Path $root 'pressure.stop'),
    $Seconds,
    $MemoryMiB
)
