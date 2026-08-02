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

Require-Command "psql"

$databaseUrl = Require-Env "TARGET_DATABASE_URL"

$requiredTables = @(
  "Tenant",
  "Branch",
  "User",
  "Membership",
  "AuditLog",
  "Lead",
  "Customer",
  "Site",
  "Survey",
  "Estimate",
  "Quote",
  "Job",
  "Invoice",
  "Payment",
  "InventoryMovement",
  "PurchaseOrder",
  "GoodsReceipt"
)

foreach ($table in $requiredTables) {
  psql $databaseUrl -v ON_ERROR_STOP=1 -c "select to_regclass('public.""$table""') as table_name;" | Out-Null
}

psql $databaseUrl -v ON_ERROR_STOP=1 -c "select count(*) as applied_migrations from public.""_prisma_migrations"";" | Out-Null

Write-Output "Restore verification completed."
