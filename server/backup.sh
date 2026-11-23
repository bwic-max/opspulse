#!/bin/sh
# Safe daily backup. Run from the OpsPulse folder, for example with cron.
mkdir -p backups
docker compose exec -T opspulse node -e "const {DatabaseSync}=require('node:sqlite');new DatabaseSync('/data/opspulse.db').exec(\"VACUUM INTO '/data/backup.db'\")" \
 && docker compose cp opspulse:/data/backup.db "backups/opspulse-$(date +%F).db" \
 && docker compose exec -T opspulse rm -f /data/backup.db \
 && echo "Backup saved to backups/opspulse-$(date +%F).db"
