#!/usr/bin/env bash
# Dumps a TransitOps database and records exact row counts next to it.
#
#   DB_HOST=localhost DB_PORT=3306 DB_USER=root DB_PASSWORD=... DB_NAME=transitops \
#     scripts/db/dump.sh [output-dir]
#
# Writes <output-dir>/<DB_NAME>-<UTC timestamp>.sql and a matching .counts file.
# Default output dir is ./backups (git-ignored: dumps contain password hashes and driver data).
set -euo pipefail

: "${DB_NAME:?Set DB_NAME}"
: "${DB_USER:?Set DB_USER}"
export MYSQL_PWD="${DB_PASSWORD:-${MYSQL_PWD:-}}"
HOST_ARGS=(-h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -u "$DB_USER")

OUT_DIR="${1:-backups}"
mkdir -p "$OUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BASE="$OUT_DIR/${DB_NAME}-${STAMP}"

mysqldump "${HOST_ARGS[@]}" \
  --single-transaction --routines --triggers --no-tablespaces --set-gtid-purged=OFF \
  --databases "$DB_NAME" > "$BASE.sql"

# Exact counts (information_schema only gives estimates for InnoDB)
TABLES=$(mysql "${HOST_ARGS[@]}" -N -B -e \
  "SELECT table_name FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_type='BASE TABLE' ORDER BY table_name")
: > "$BASE.counts"
for t in $TABLES; do
  n=$(mysql "${HOST_ARGS[@]}" -N -B -e "SELECT COUNT(*) FROM \`$DB_NAME\`.\`$t\`")
  printf '%s\t%s\n' "$t" "$n" >> "$BASE.counts"
done

echo "Dump:   $BASE.sql"
echo "Counts: $BASE.counts"
cat "$BASE.counts"
