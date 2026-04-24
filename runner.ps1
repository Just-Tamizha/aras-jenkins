# Get current folder (Sample location)
$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildAndDeploy    = Join-Path $scriptDir "BuildAndDeploy.ps1"
$logFile    = Join-Path $scriptDir "BuildAndDeploy.log"

# Remove old log if exists
if (Test-Path $logFile) {
    Remove-Item $logFile -Force
}

Write-Host "Starting BuildAndDeploy.ps1 with Administrator privileges..."

# Start BuildAndDeploy.ps1 as Admin
$process = Start-Process powershell.exe `
    -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$BuildAndDeploy`" *> `"$logFile`"" `
    -Verb RunAs `
    -PassThru

Write-Host "BuildAndDeploy.ps1 is running..."
Write-Host "Showing output below:`n"

# Stream output live until process exits
while (-not $process.HasExited) {
    if (Test-Path $logFile) {
        Get-Content $logFile -Tail 20 -Wait
    }
}

Write-Host "`n✅ BuildAndDeploy.ps1 finished."