#!/usr/bin/env bash
# Resilient Prisma migrate for Vercel + Neon.
# Uses the direct (unpooled) connection and retries to ride out the advisory
# lock that pooled connections can leave stuck. Fails only after all retries
# so a genuinely broken migration still stops the deploy.
set -u

URL="${DATABASE_URL_UNPOOLED:-${POSTGRES_URL_NON_POOLING:-$DATABASE_URL}}"

for attempt in 1 2 3 4 5; do
  if DATABASE_URL="$URL" npx prisma migrate deploy; then
    echo "migrate deploy succeeded (attempt $attempt)"
    exit 0
  fi
  wait=$((attempt * 8))
  echo "migrate deploy failed (attempt $attempt); retrying in ${wait}s…"
  sleep "$wait"
done

echo "migrate deploy failed after 5 attempts"
exit 1
