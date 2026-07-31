#!/bin/bash

DUMP_DIR="dump"
mkdir -p $DUMP_DIR
NEW_FILE="$DUMP_DIR/$(date +%s)_grisc_sa.dump"
docker compose exec -T postgres \
     pg_dump -U postgres -d grisc_sa -Fc \
     > $NEW_FILE

# scp $NEW_FILE backup-user@backup-server:/