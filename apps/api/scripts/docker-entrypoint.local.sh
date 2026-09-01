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

# Start the API in the background: Strava's webhook verification (below)
# calls back into this same server, so it must already be listening before
# we ask Strava to create the subscription.
cd /app/apps/api
node dist/main.js &
API_PID=$!
trap 'kill -TERM "$API_PID" 2>/dev/null' TERM INT

if [ -n "$STRAVA_CLIENT_ID" ] && [ -n "$STRAVA_CLIENT_SECRET" ] && [ -n "$STRAVA_WEBHOOK_URL" ] && [ -n "$STRAVA_WEBHOOK_TOKEN" ]; then
  echo "Ensuring Strava webhook subscription..."
  # Give the API a moment to finish starting up and bind its port.
  sleep 5
  if ! node /app/apps/api/scripts/ensure-strava-webhook.mjs; then
    echo "WARNING: Failed to ensure Strava webhook subscription (continuing startup)"
  fi
else
  echo "Strava webhook env vars not fully set, skipping webhook subscription check"
fi

wait "$API_PID"

