#!/bin/sh
set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
COMPOSE_FILE="$PROJECT_ROOT/compose.oracle.yml"
ENV_FILE="$PROJECT_ROOT/deploy/oracle/oracle.env"
BACKUP_ROOT=${1:-"$PROJECT_ROOT/backups"}
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
DESTINATION="$BACKUP_ROOT/$TIMESTAMP"

if [ ! -f "$ENV_FILE" ]; then
    echo "Missing $ENV_FILE" >&2
    exit 1
fi

mkdir -p "$DESTINATION"
cd "$PROJECT_ROOT"

docker compose -f "$COMPOSE_FILE" exec -T db sh -c \
    'pg_dump --clean --if-exists --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB"' \
    | gzip > "$DESTINATION/database.sql.gz"

docker compose -f "$COMPOSE_FILE" exec -T web \
    tar -C /app/media -czf - . > "$DESTINATION/media.tar.gz"

sha256sum "$DESTINATION/database.sql.gz" "$DESTINATION/media.tar.gz" \
    > "$DESTINATION/SHA256SUMS"

echo "Backup created at $DESTINATION"
