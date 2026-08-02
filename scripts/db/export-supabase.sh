#!/usr/bin/env bash
set -euo pipefail

OUTPUT_ROOT="${1:-/secure-backups/tradesperson}"

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

require_command pg_dump
require_command sha256sum
require_env DIRECT_URL

timestamp="$(date -u +%Y%m%d-%H%M%S)"
backup_dir="${OUTPUT_ROOT}/${timestamp}"
mkdir -p "$backup_dir"

pg_dump "$DIRECT_URL" --schema-only --no-owner --no-privileges --file "$backup_dir/tradesperson-schema.sql"
pg_dump "$DIRECT_URL" --data-only --no-owner --no-privileges --file "$backup_dir/tradesperson-data.sql"
pg_dump "$DIRECT_URL" --format custom --no-owner --no-privileges --file "$backup_dir/tradesperson-full.dump"

(cd "$backup_dir" && sha256sum tradesperson-schema.sql tradesperson-data.sql tradesperson-full.dump > manifest.sha256)

echo "Backup completed: $backup_dir"
