# Test fixtures

## `schema.sql`

Generated from production. Re-generate with:

```bash
ssh root@138.124.14.157 \
  'docker exec lawtech-db mysqldump \
     -uroot -plawtech_root_password_2024 \
     --no-data --routines --triggers \
     --skip-comments --no-tablespaces --set-gtid-purged=OFF \
     lawtech_crm' \
  > server/__tests__/fixtures/schema.sql
```

The raw migration SQL files use MariaDB-flavoured `ADD COLUMN IF NOT EXISTS`
and stored procedures with `DELIMITER` that don't parse via `mysql2`'s JS
driver. Snapshotting the live schema avoids that whole class of problems and
keeps tests aligned with what the production DB actually looks like.
