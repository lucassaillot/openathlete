#!/bin/sh
set -e

# Check required environment variables
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is required"
  exit 1
fi

cd /app/libs/database

export DATABASE_URL

# Run migrations
if prisma migrate deploy; then
  echo "✓ Migrations completed successfully"
else
  echo "ERROR: Migrations failed"
  exit 1
fi

if [ -n "$STRAVA_CLIENT_ID" ] && [ -n "$STRAVA_CLIENT_SECRET" ] && [ -n "$STRAVA_WEBHOOK_URL" ] && [ -n "$STRAVA_WEBHOOK_TOKEN" ]; then
  echo "Ensuring Strava webhook subscription..."
  if ! node /app/apps/api/scripts/ensure-strava-webhook.mjs; then
    echo "WARNING: Failed to ensure Strava webhook subscription (continuing startup)"
  fi
else
  echo "Strava webhook env vars not fully set, skipping webhook subscription check"
fi

# Start the API
cd /app/apps/api
exec node dist/main.js

