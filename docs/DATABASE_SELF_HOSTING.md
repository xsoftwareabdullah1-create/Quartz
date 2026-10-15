# Quartz data store, self-hosting and recovery

**Standalone schema repository:** https://github.com/xsoftwareabdullah1-create/Database. The canonical additive SQL migration is [migrations/001_user_data.sql](https://github.com/xsoftwareabdullah1-create/Database/blob/main/migrations/001_user_data.sql); a synchronized copy is kept at [auth/migrations/001_user_data.sql](../auth/migrations/001_user_data.sql) in Quartz.

## Current deployment / safety

Quartz currently uses the existing PostgreSQL 16 database `quartz-auth-db` and the `quartz-auth-service` for sign-in. This change is additive: it creates new tables and indexes only; it does not drop or rename existing tables, rewrite user records, or change the existing sign-in routes. The application runs these idempotent `CREATE TABLE IF NOT EXISTS` migrations at startup.

Database dashboard: https://dashboard.render.com/d/dpg-db8bvqom7kps73drngg0-a  
Auth service dashboard: https://dashboard.render.com/web/srv-db8c0bgm7kps73drp9k0

**Important:** the existing Render database is Free and has an expiry date shown in its dashboard (currently 2026-11-14). Free resources are not a permanent production backup. Download a verified backup and migrate before that date. Never commit database URLs, passwords, session secrets or provider API keys.

## Tables added

- `quartz_profiles`: one profile per account; display name, bio, avatar URL and timezone.
- `quartz_settings`: one JSONB settings object per account.
- `quartz_history`: per-account history entries, metadata and timestamp; indexed newest-first.
- `quartz_files`: per-account file metadata and a `storage_key`; declared file size capped at 10 MiB.
- Existing `quartz_users`, `quartz_sessions`, and `quartz_email_codes` remain in place.

All user-data endpoints require the existing signed-in session and scope reads/writes by the session's user ID:
- `GET/PATCH /api/profile`
- `GET/PUT /api/settings` (send `{"settings":{...}}`)
- `GET/POST /api/history`, `DELETE /api/history/:id`
- `GET/POST /api/files`, `DELETE /api/files/:id`

File records hold metadata only. File bytes should live on a self-hosted persistent volume or object storage; `storage_key` should be an internal key, not an arbitrary public URL. Do not expose a file merely because a metadata record exists.

## Realistic free-tier expectations

- Render Free PostgreSQL is suitable for development/testing only: storage and connection limits apply, it may expire/suspend, and it is not a substitute for offsite backups.
- For self-hosting, run PostgreSQL on a VPS/home server with a persistent disk and restricted network access. Keep PostgreSQL private (bind to localhost/private network; do not open port 5432 to the public internet). A single small server is low cost, not high availability.
- Keep uploads on a persistent volume and set an application-level quota (start with 100 MiB per account and 10 MiB per file, adjustable after measuring disk usage). A database row does not store the uploaded bytes.
- Set connection pooling and conservative app concurrency on small machines. Monitor free disk space, database size and backup age.

## Backup before migration

1. Put the app in maintenance/read-only mode if available; otherwise pause writes during the final dump.
2. Take a logical backup from a trusted machine with PostgreSQL client tools. Use the **private/internal** database URL where available, and do not paste credentials into chat or shell history.

   ```sh
   umask 077
   pg_dump --format=custom --no-owner --no-privileges "$SOURCE_DATABASE_URL" --file "quartz-$(date +%F-%H%M).dump"
   pg_restore --list "quartz-$(date +%F-%H%M).dump" >/dev/null
   sha256sum quartz-*.dump
   ```

   Set `SOURCE_DATABASE_URL` in your local shell securely first. Store the dump encrypted, separate from the source host. Also back up any file volume separately.
3. Restore into a **new empty target database**, never over the current database:

   ```sh
   createdb "$TARGET_DATABASE_NAME"
   pg_restore --exit-on-error --no-owner --no-privileges --dbname="$TARGET_DATABASE_URL" quartz-YYYY-MM-DD-HHMM.dump
   ```

   Replace the example dump filename with the actual file. If your host does not allow `createdb`, create an empty database in its dashboard.
4. Verify table counts, a test account's sign-in, profile/settings/history reads and file metadata. Compare `SELECT count(*) FROM quartz_users;` and other key table counts on source and target. Keep the original database untouched.
5. Change only the auth service's `DATABASE_URL` to the target URL using its secret environment settings, deploy/restart, and test `/health`, email/Google sign-in and `/auth/me`. Keep the source backup and source database until the new deployment is stable.
6. Take a fresh backup from the target and test restoring it periodically. A backup is only proven when restore has succeeded.

## Self-hosted deployment outline

1. Install a supported PostgreSQL version (16+) and configure a persistent disk, private listener, firewall and automated security updates.
2. Create a dedicated database and least-privilege app role; use TLS when crossing hosts.
3. Back up the Render database and restore into the new database using the steps above.
4. Deploy `auth/` with Node.js 20+, setting `DATABASE_URL`, a random `SESSION_SECRET` of at least 32 characters, `QUARTZ_WEB_URL`, and `QUARTZ_PUBLIC_URL`. Configure the mail provider and Google OAuth redirect URI if using those sign-in methods.
5. Point the frontend's `authBase` at the new HTTPS auth URL. Keep cookies HTTPS-only; do not test production auth on plain HTTP.
6. Validate and monitor before switching traffic. Keep a rollback plan: point `DATABASE_URL` and frontend `authBase` back to the old service only if no writes occurred on the new target, or reconcile those writes first.

This document is operational guidance, not a claim that a backup or migration has already been run.
