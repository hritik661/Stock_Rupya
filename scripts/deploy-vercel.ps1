<#
deploy-vercel.ps1

Usage: run from repository root in PowerShell (Windows)
  .\scripts\deploy-vercel.ps1

What it does:
- Loads key/value pairs from .env.local
- Exports VERCEL_TOKEN from VERCEL_OIDC_TOKEN if present
- Attempts to add each env var to the Vercel project (production, preview, development)
- Runs `vercel --prod` to deploy the project

Notes:
- This script attempts non-interactive ops when `VERCEL_TOKEN` is available.
- If interactive login is required, run `vercel login` first.
#>

Set-StrictMode -Version Latest

function Parse-EnvFile {
    param([string]$Path)
    $result = @{}
    if (-not (Test-Path $Path)) { return $result }
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq '') { return }
        if ($line.StartsWith('#')) { return }
        if ($line -match '^(.*?)=(.*)$') {
            $k = $matches[1].Trim()
            $v = $matches[2].Trim()
            if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1,$v.Length-2) }
            if ($v.StartsWith("'") -and $v.EndsWith("'")) { $v = $v.Substring(1,$v.Length-2) }
            $result[$k] = $v
        }
    }
    return $result
}

$envPath = Join-Path -Path (Get-Location) -ChildPath '.env.local'
$envVars = Parse-EnvFile -Path $envPath

if ($envVars.Count -eq 0) {
    Write-Host "No .env.local found or no variables parsed. Exiting." -ForegroundColor Yellow
    exit 1
}

# Export token if present
if ($envVars.ContainsKey('VERCEL_OIDC_TOKEN')) {
    $env:VERCEL_TOKEN = $envVars['VERCEL_OIDC_TOKEN']
    Write-Host "VERCEL_TOKEN set for this session." -ForegroundColor Green
}

try {
    & vercel --version > $null
} catch {
    Write-Host "Vercel CLI not found. Please install it: npm i -g vercel" -ForegroundColor Yellow
    exit 1
}

Write-Host "Adding env vars to Vercel (production) using CLI..." -ForegroundColor Cyan

foreach ($k in $envVars.Keys) {
    if ($k -eq 'VERCEL_OIDC_TOKEN') { continue }
    $v = $envVars[$k]
    Write-Host "Adding $k to production..."
    try {
        & vercel env add $k $v production --token $env:VERCEL_TOKEN --yes 2>$null
    } catch {
        Write-Host "Warning: could not add $k non-interactively. It may already exist or require confirmation." -ForegroundColor Yellow
    }
}

Write-Host "Triggering production deploy..." -ForegroundColor Cyan
try {
    & vercel --prod --token $env:VERCEL_TOKEN --confirm --yes
} catch {
    Write-Host "Production deploy failed or required interaction. Try running 'vercel login' and re-run this script." -ForegroundColor Red
    exit 1
}

Write-Host "Deploy complete." -ForegroundColor Green
