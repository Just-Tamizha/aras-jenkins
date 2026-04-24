$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$builder   = Join-Path $scriptDir "builder.ps1"
$logFile   = Join-Path $scriptDir "builder.log"

if (Test-Path $logFile) {
    Remove-Item $logFile -Force
}

# Start builder as Admin
$process = Start-Process powershell.exe `
    -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$builder`" *> `"$logFile`"" `
    -Verb RunAs `
    -PassThru

Write-Host "Streaming live log output..."
Write-Host "--------------------------------"

# ✅ TRUE LIVE STREAM
Get-Content -Path $logFile -Wait

# ✅ This line runs only after builder.ps1 finishes
$process.WaitForExit()

Write-Host "`n✅ builder.ps1 completed"
