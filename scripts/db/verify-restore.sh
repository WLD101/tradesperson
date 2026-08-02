#!/usr/bin/env bash
set -euo pipefail

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Required command '$1' was not found on PATH." >&2
    exit 1
  }
}

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "Required environment variable '$name' is not set." >&2
    exit 1
  fi
}

require_command psql
require_env TARGET_DATABASE_URL

for table in Tenant Branch User Membership AuditLog Lead Customer Site Survey Estimate Quote Job Invoice Payment InventoryMovement PurchaseOrder GoodsReceipt; do
  psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -c "select to_regclass('public.\"${table}\"') as table_name;" >/dev/null
done

psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -c 'select count(*) as applied_migrations from public."_prisma_migrations";' >/dev/null

echo "Restore verification completed."
