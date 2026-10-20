param(
    [string]$SiteRoot = (Join-Path $PSScriptRoot 'site'),
    [int]$AuxPort = 0
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = [IO.Path]::GetFullPath($SiteRoot).TrimEnd('\')
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://127.0.0.1:4178/')
if ($AuxPort) { $listener.Prefixes.Add("http://127.0.0.1:$AuxPort/") }
$listener.Start()
try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $response = $context.Response
        try {
            if ($context.Request.HttpMethod -notin @('GET', 'HEAD')) {
                $response.StatusCode = 405
                continue
            }
            if ($AuxPort -and $context.Request.Url.Port -eq $AuxPort) {
                # The unmodified e2e production client checks its configured VIN URL.
                # This one read-only endpoint is the sole auxiliary-origin fixture.
                $response.Headers.Add('Access-Control-Allow-Origin', 'http://127.0.0.1:4178')
                if ($context.Request.Url.AbsolutePath -eq '/vin.txt') {
                    $response.StatusCode = 200
                    $response.ContentType = 'text/plain; charset=utf-8'
                    $response.ContentLength64 = 0
                } else {
                    $response.StatusCode = 404
                }
                continue
            }
            $relative = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath).TrimStart('/')
            if (!$relative -or $relative -eq 'collection/official') { $relative = 'index.html' }
            $file = [IO.Path]::GetFullPath((Join-Path $root $relative))
            if (!$file.StartsWith($root + '\', [StringComparison]::OrdinalIgnoreCase)) {
                $response.StatusCode = 403
                continue
            }
            if (![IO.File]::Exists($file)) {
                $response.StatusCode = 404
                continue
            }
            $response.ContentType = switch ([IO.Path]::GetExtension($file)) {
                '.html' { 'text/html; charset=utf-8' }
                '.js' { 'text/javascript; charset=utf-8' }
                '.css' { 'text/css; charset=utf-8' }
                '.json' { 'application/json; charset=utf-8' }
                '.map' { 'application/json; charset=utf-8' }
                '.svg' { 'image/svg+xml' }
                '.png' { 'image/png' }
                '.jpg' { 'image/jpeg' }
                '.ico' { 'image/x-icon' }
                '.woff2' { 'font/woff2' }
                default { 'application/octet-stream' }
            }
            $response.Headers.Add('Cache-Control', 'no-store')
            $body = [IO.File]::ReadAllBytes($file)
            $response.ContentLength64 = $body.LongLength
            if ($context.Request.HttpMethod -eq 'GET') {
                $response.OutputStream.Write($body, 0, $body.Length)
            }
        } catch {
            try { $response.StatusCode = 500 } catch {}
        } finally {
            $entry = '{0} {1} {2} {3}' -f [DateTime]::UtcNow.ToString('o'),$context.Request.HttpMethod,$context.Request.Url.AbsoluteUri,$response.StatusCode
            [IO.File]::AppendAllText((Join-Path $PSScriptRoot 'p0-server-requests.log'), $entry + [Environment]::NewLine)
            $response.Close()
        }
    }
} finally {
    $listener.Close()
}
