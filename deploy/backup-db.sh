#!/bin/bash
set -e

BACKUP_DIR="/srv/projects/ximples/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="ximples_db_${DATE}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo ">> Backing up database..."
PGPASSWORD="CHANGE_THIS_PASSWORD" pg_dump -h 127.0.0.1 -U ximples_user ximples_db | gzip > "$BACKUP_DIR/$FILENAME"

# Keep only last 30 backups
ls -tp "$BACKUP_DIR"/ximples_db_*.sql.gz | tail -n +31 | xargs -I {} rm -- {} 2>/dev/null || true

echo ">> Backup saved: $BACKUP_DIR/$FILENAME"
echo ">> Size: $(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)"
