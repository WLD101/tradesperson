param(
  [string]$OutputRoot = "C:\secure-backups\tradesperson"
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

Require-Command "pg_dump"
Require-Command "Get-FileHash"

$databaseUrl = Require-Env "DIRECT_URL"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $OutputRoot $timestamp
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$schemaFile = Join-Path $backupDir "tradesperson-schema.sql"
$dataFile = Join-Path $backupDir "tradesperson-data.sql"
$fullFile = Join-Path $backupDir "tradesperson-full.dump"
$manifestFile = Join-Path $backupDir "manifest.sha256"

pg_dump $databaseUrl --schema-only --no-owner --no-privileges --file $schemaFile
pg_dump $databaseUrl --data-only --no-owner --no-privileges --file $dataFile
pg_dump $databaseUrl --format custom --no-owner --no-privileges --file $fullFile

Get-FileHash -Algorithm SHA256 $schemaFile, $dataFile, $fullFile |
  ForEach-Object { "$($_.Hash)  $([System.IO.Path]::GetFileName($_.Path))" } |
  Set-Content -Path $manifestFile -Encoding ascii

Write-Output "Backup completed: $backupDir"
