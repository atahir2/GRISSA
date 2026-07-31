#!/bin/bash

DUMP_DIR="dump"
mkdir -p $DUMP_DIR
NEW_DUMP_FILE="$DUMP_DIR/$(date +%s)_grisc_sa.dump"
docker compose exec -T postgres \
     pg_dump -U postgres -d grisc_sa -Fc \
     > $NEW_DUMP_FILE

# scp $NEW_DUMP_FILE backup-user@backup-server:/
set -a; source .env.production; set +a;
scp "$NEW_DUMP_FILE" $SERVER_BACKUP_USER@$SERVER_BACKUP:/home/goncalo/grissa_backup/
# New thing