$ErrorActionPreference = 'Stop'

function Invoke-Git {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
    & git @GitArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Git command failed: git $($GitArgs -join ' ')"
    }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Git is not installed. Install Git for Windows first.'
}
if (-not (Test-Path (Join-Path (Get-Location) '.git'))) {
    throw 'Run this script from the root of your local airport-tycoon Git clone.'
}
$remote = (& git remote get-url origin).Trim()
if ($LASTEXITCODE -ne 0 -or $remote -notmatch 'github\.com[:/]echoairgroup/airport-tycoon(?:\.git)?$') {
    throw "The origin remote does not point to echoairgroup/airport-tycoon. Found: $remote"
}
$branch = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $branch -ne 'main') {
    throw "Switch to the main branch before publishing. Current branch: $branch"
}

Invoke-Git add -A
& git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host 'No changes to publish.'
    exit 0
}
Invoke-Git commit -m 'Import Airport Tycoon Arcade 0.2.1'
Invoke-Git push origin main
Write-Host 'Airport Tycoon Arcade 0.2.1 has been pushed to GitHub.'
