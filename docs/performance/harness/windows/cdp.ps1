$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Open-SrkCdp {
    param([string]$WebSocketUrl)
    if (!$WebSocketUrl) {
        $targets = Invoke-RestMethod -Uri 'http://127.0.0.1:9223/json/list'
        $WebSocketUrl = ($targets | Where-Object type -eq 'page' | Select-Object -First 1).webSocketDebuggerUrl
    }
    if (!$WebSocketUrl) { throw 'No isolated Edge page target found' }
    $script:SrkCdpSocket = New-Object System.Net.WebSockets.ClientWebSocket
    $script:SrkCdpCancel = New-Object System.Threading.CancellationTokenSource
    $script:SrkCdpCancel.CancelAfter(180000)
    [void]$script:SrkCdpSocket.ConnectAsync([Uri]$WebSocketUrl, $script:SrkCdpCancel.Token).GetAwaiter().GetResult()
    $script:SrkCdpSequence = 0
}

function Send-SrkCdp {
    param(
        [Parameter(Mandatory=$true)][string]$Method,
        [hashtable]$Params = @{},
        [int]$TimeoutMs = 120000
    )
    $script:SrkCdpCancel.CancelAfter($TimeoutMs)
    $script:SrkCdpSequence += 1
    $id = $script:SrkCdpSequence
    $message = @{ id=$id; method=$Method; params=$Params } | ConvertTo-Json -Depth 50 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($message)
    $segment = New-Object 'System.ArraySegment[byte]' -ArgumentList @(,$bytes)
    [void]$script:SrkCdpSocket.SendAsync($segment, [Net.WebSockets.WebSocketMessageType]::Text, $true, $script:SrkCdpCancel.Token).GetAwaiter().GetResult()
    while ($true) {
        $buffer = New-Object byte[] 65536
        $stream = New-Object IO.MemoryStream
        try {
            do {
                $chunk = New-Object 'System.ArraySegment[byte]' -ArgumentList @(,$buffer)
                $received = $script:SrkCdpSocket.ReceiveAsync($chunk, $script:SrkCdpCancel.Token).GetAwaiter().GetResult()
                if ($received.MessageType -eq [Net.WebSockets.WebSocketMessageType]::Close) { throw 'CDP socket closed' }
                $stream.Write($buffer, 0, $received.Count)
            } until ($received.EndOfMessage)
            $data = [Text.Encoding]::UTF8.GetString($stream.ToArray()) | ConvertFrom-Json
        } finally {
            $stream.Dispose()
        }
        if ($data.id -eq $id) {
            if ($data.error) { throw ($data.error | ConvertTo-Json -Compress) }
            return $data.result
        }
    }
}

function Close-SrkCdp {
    if ($script:SrkCdpSocket) { $script:SrkCdpSocket.Dispose() }
    if ($script:SrkCdpCancel) { $script:SrkCdpCancel.Dispose() }
}
