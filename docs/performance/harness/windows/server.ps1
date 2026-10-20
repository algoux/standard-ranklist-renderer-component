$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'dist'))
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://127.0.0.1:4178/')
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
            $relative = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath).TrimStart('/')
            if (!$relative) { $relative = 'index.html' }
            $file = [IO.Path]::GetFullPath((Join-Path $root $relative))
            if (!$file.StartsWith($root + '\', [StringComparison]::OrdinalIgnoreCase)) {
                $response.StatusCode = 403
                continue
            }
            if (![IO.File]::Exists($file)) {
                $response.StatusCode = 404
                continue
            }
            $extension = [IO.Path]::GetExtension($file)
            $response.ContentType = switch ($extension) {
                '.html' { 'text/html; charset=utf-8' }
                '.js' { 'text/javascript; charset=utf-8' }
                '.css' { 'text/css; charset=utf-8' }
                '.json' { 'application/json; charset=utf-8' }
                '.map' { 'application/json; charset=utf-8' }
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
            $response.Close()
        }
    }
} finally {
    $listener.Close()
}
