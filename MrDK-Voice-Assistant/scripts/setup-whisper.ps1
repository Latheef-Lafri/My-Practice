# Mr.DK Offline Speech Recognition setup (Windows 64-bit, CPU)
# Run from the MrDK-Voice-Assistant project root:
# powershell -ExecutionPolicy Bypass -File .\scripts\setup-whisper.ps1
param([ValidateSet('base','small')][string]$Model = 'base')

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$projectRoot = Split-Path -Parent $PSScriptRoot
$target = Join-Path $projectRoot 'tools\whisper'
New-Item -ItemType Directory -Force -Path $target | Out-Null

# Official v1.9.5 stable release contains no binary assets, but its
# published b5454 build includes the regular Windows x64 CPU archive.
$binaryUrl = 'https://github.com/ggml-org/whisper.cpp/releases/download/b5454/whisper-bin-x64.zip'
$zipPath = Join-Path $target 'whisper-bin-x64.zip'
$cli = Get-ChildItem -Path $target -Filter 'whisper-cli.exe' -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $cli) {
    Write-Host 'Downloading official whisper.cpp Windows x64 CPU binaries (b5454)...' -ForegroundColor Cyan
    try {
        Invoke-WebRequest -Uri $binaryUrl -OutFile $zipPath -UseBasicParsing
        if ((Get-Item -LiteralPath $zipPath).Length -lt 100000) {
            throw 'Downloaded archive is unexpectedly small.'
        }
        Expand-Archive -LiteralPath $zipPath -DestinationPath $target -Force
    } catch {
        throw "Whisper binary download/extract failed: $($_.Exception.Message). Download manually: $binaryUrl"
    } finally {
        Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue
    }
    $cli = Get-ChildItem -Path $target -Filter 'whisper-cli.exe' -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $cli) { throw "Cannot find whisper-cli.exe inside $target after extraction." }
} else {
    Write-Host 'Whisper executable already present; skipping binary download.' -ForegroundColor Cyan
}

$modelPath = Join-Path $target "ggml-$Model.bin"
if (-not (Test-Path -LiteralPath $modelPath) -or (Get-Item -LiteralPath $modelPath).Length -lt 100000000) {
    Write-Host "Downloading multilingual Whisper $Model model..." -ForegroundColor Cyan
    $modelUrl = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-$Model.bin?download=true"
    try {
        Invoke-WebRequest -Uri $modelUrl -OutFile $modelPath -UseBasicParsing
        if ((Get-Item -LiteralPath $modelPath).Length -lt 100000000) {
            throw 'Downloaded model is unexpectedly small.'
        }
    } catch {
        Remove-Item -LiteralPath $modelPath -Force -ErrorAction SilentlyContinue
        throw "Whisper model download failed: $($_.Exception.Message). Download manually: $modelUrl"
    }
} else {
    Write-Host 'Whisper model already present; skipping model download.' -ForegroundColor Cyan
}

Write-Host ''
Write-Host 'Mr.DK Whisper setup completed!' -ForegroundColor Green
Write-Host "Whisper executable: $($cli.FullName)" -ForegroundColor Yellow
Write-Host "Whisper model:      $modelPath" -ForegroundColor Yellow
Write-Host 'Next: Mr.DK > Settings > Offline Whisper > select these two files.'
