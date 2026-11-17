Write-Host 'Mr.DK Windows environment check' -ForegroundColor Cyan
Write-Host '==============================='
foreach ($cmd in @('node','npm','ollama')) {
  $found=Get-Command $cmd -ErrorAction SilentlyContinue
  if ($found) { Write-Host "[OK] $cmd at $($found.Source)" -ForegroundColor Green }
  else { Write-Host "[MISSING] $cmd" -ForegroundColor Yellow }
}
try {
  $response=Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 4
  Write-Host "[OK] Ollama server reachable; installed models: $(($response.models.name) -join ', ')" -ForegroundColor Green
} catch { Write-Host '[NOT RUNNING] Ollama server unavailable on localhost:11434' -ForegroundColor Yellow }
$exe=Get-ChildItem -Path '.\tools\whisper' -Filter 'whisper-cli.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if ($exe) { Write-Host "[OK] whisper-cli.exe: $($exe.FullName)" -ForegroundColor Green }
else { Write-Host '[OPTIONAL] Whisper not installed yet' -ForegroundColor Yellow }
Write-Host 'Enable Windows Settings > Privacy & security > Microphone > desktop app access.'
