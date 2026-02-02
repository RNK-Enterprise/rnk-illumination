$manifest = Get-Content MANIFEST.txt | Where-Object { $_ -and -not $_.StartsWith('#') }
$existing = @()
foreach ($f in $manifest) {
  if (Test-Path $f) { $existing += $f }
}
$zipPath = "rnk-illumination-1.2.18.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }
Compress-Archive -Path $existing -DestinationPath $zipPath
Write-Host "Zip created with proper structure."