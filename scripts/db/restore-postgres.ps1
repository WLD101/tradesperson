param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile
)

$ErrorActionPreference = "Stop"

function Require-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found on PATH."
  }
}

function Require-Env($Name) {
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Required environment variable '$Name' is not set."
  }
  return $value
}

Require-Command "pg_restore"
Require-Command "psql"

if (-not (Test-Path -LiteralPath $BackupFile)) {
  throw "Backup file was not found: $BackupFile"
}

$targetUrl = Require-Env "TARGET_DATABASE_URL"

pg_restore --dbname $targetUrl --clean --if-exists --no-owner --no-privileges $BackupFile
psql $targetUrl -v ON_ERROR_STOP=1 -c "select now() as restored_at;"

Write-Output "Restore completed into TARGET_DATABASE_URL."
