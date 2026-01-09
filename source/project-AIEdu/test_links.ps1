$files = @('index.html', 'listen.html', 'research.html', 'explore.html', 'practice.html', 'evaluate.html', 'write.html')
$baseUrl = 'http://localhost:8000/'

foreach ($file in $files) {
    $url = $baseUrl + $file
    try {
        $response = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing
        Write-Host "$url - $($response.StatusCode) OK"
    } catch {
        Write-Host "$url - Error: $($_.Exception.Message)"
    }
}