param(
  [Parameter(Mandatory=$true)][string]$TextPath
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $voice.Rate = 0
  $text = [System.IO.File]::ReadAllText($TextPath, [System.Text.Encoding]::UTF8)
  if ([string]::IsNullOrWhiteSpace($text)) { exit 0 }
  $voice.Speak($text)
} finally {
  $voice.Dispose()
}
