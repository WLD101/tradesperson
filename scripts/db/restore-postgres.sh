#!/usr/bin/env bash
set -euo pipefail

backup_file="${1:-}"

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

if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
  echo "Usage: TARGET_DATABASE_URL=postgres://... $0 /path/to/tradesperson-full.dump" >&2
  exit 1
fi

require_command pg_restore
require_command psql
require_env TARGET_DATABASE_URL

pg_restore --dbname "$TARGET_DATABASE_URL" --clean --if-exists --no-owner --no-privileges "$backup_file"
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -c "select now() as restored_at;"

echo "Restore completed into TARGET_DATABASE_URL."
