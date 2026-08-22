#!/bin/sh
set -e

log() {
  echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') $*"
}

die() {
  log "ERROR: $*"
  exit 1
}

log "OpenAthlete API entrypoint starting"

if [ -z "$DATABASE_URL" ]; then
  die "DATABASE_URL is required"
fi

case "$DATABASE_URL" in
  postgresql://*|postgres://*) ;;
  *) die "DATABASE_URL must start with postgresql:// or postgres://" ;;
esac

if [ -n "$REDIS_URL" ]; then
  case "$REDIS_URL" in
    redis://*|rediss://*) ;;
    *) die "REDIS_URL must start with redis:// or rediss://" ;;
  esac
fi

if [ "${SKIP_MIGRATIONS:-false}" = "true" ]; then
  log "Skipping database migrations (SKIP_MIGRATIONS=true)"
else
  log "Running prisma migrate deploy..."
  cd /app/libs/database
  if ! prisma migrate deploy; then
    die "prisma migrate deploy failed"
  fi
  log "Migrations completed successfully"
fi

log "Starting NestJS (node dist/main.js)"
cd /app/apps/api

if [ "$(id -u)" = "0" ]; then
  exec su-exec openathlete node dist/main.js
fi

exec node dist/main.js
