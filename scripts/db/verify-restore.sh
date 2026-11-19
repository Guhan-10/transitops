#!/usr/bin/env bash
# Restores a dump made by dump.sh into an EMPTY scratch database and checks that
# every table has the same row count as when it was dumped.
#
#   DB_HOST=localhost DB_PORT=3306 DB_USER=root DB_PASSWORD=... \
#     scripts/db/verify-restore.sh backups/transitops-<stamp>.sql [scratch_db_name]
#
# The scratch database (default: transitops_restore_check) must not already exist.
# It is dropped again afterwards unless KEEP_RESTORE=1.
set -euo pipefail

DUMP="${1:?Usage: verify-restore.sh <dump.sql> [scratch_db_name]}"
COUNTS="${DUMP%.sql}.counts"
SCRATCH="${2:-transitops_restore_check}"
[ -f "$COUNTS" ] || { echo "Missing counts file: $COUNTS" >&2; exit 2; }

: "${DB_USER:?Set DB_USER}"
export MYSQL_PWD="${DB_PASSWORD:-${MYSQL_PWD:-}}"
HOST_ARGS=(-h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -u "$DB_USER")

EXISTS=$(mysql "${HOST_ARGS[@]}" -N -B -e "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='$SCRATCH'")
if [ "$EXISTS" != "0" ]; then
  echo "Scratch database '$SCRATCH' already exists; pick another name or drop it first." >&2
  exit 2
fi

# The dump names its source database (CREATE DATABASE / USE); point those at the scratch DB.
SOURCE_DB=$(sed -n 's/^USE `\(.*\)`;$/\1/p' "$DUMP" | head -1)
[ -n "$SOURCE_DB" ] || { echo "Could not find a USE statement in $DUMP" >&2; exit 2; }
sed -e "s/^CREATE DATABASE \/\*!32312 IF NOT EXISTS\*\/ \`$SOURCE_DB\`/CREATE DATABASE \`$SCRATCH\`/" \
    -e "s/^USE \`$SOURCE_DB\`;/USE \`$SCRATCH\`;/" "$DUMP" | mysql "${HOST_ARGS[@]}"

FAIL=0
while IFS=$'\t' read -r table expected; do
  actual=$(mysql "${HOST_ARGS[@]}" -N -B -e "SELECT COUNT(*) FROM \`$SCRATCH\`.\`$table\`")
  if [ "$actual" = "$expected" ]; then
    printf 'OK    %-20s %s\n' "$table" "$actual"
  else
    printf 'FAIL  %-20s expected %s, got %s\n' "$table" "$expected" "$actual"
    FAIL=1
  fi
done < "$COUNTS"

if [ "${KEEP_RESTORE:-0}" != "1" ]; then
  mysql "${HOST_ARGS[@]}" -e "DROP DATABASE \`$SCRATCH\`"
fi

if [ "$FAIL" = "1" ]; then echo "Row counts differ." >&2; exit 1; fi
echo "Restore verified: all row counts match."
