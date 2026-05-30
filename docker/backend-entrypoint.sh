#!/bin/sh
set -e

# Đợi Postgres sẵn sàng — tránh race khi container backend start trước khi
# Postgres mở cổng. Healthcheck của postgres trong compose đã làm điều này,
# nhưng vẫn giữ retry như fallback khi chạy ngoài compose.
if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] chờ Postgres sẵn sàng..."
  i=0
  until node -e "
    const { Client } = require('pg');
    const c = new Client({ connectionString: process.env.DATABASE_URL });
    c.connect().then(() => c.end()).catch(e => { process.exit(1); });
  " 2>/dev/null; do
    i=$((i+1))
    if [ "$i" -gt 30 ]; then
      echo "[entrypoint] Postgres không phản hồi sau 30 lần thử, thoát."
      exit 1
    fi
    sleep 2
  done
  echo "[entrypoint] Postgres OK."
fi

# Chạy migrations trước khi start app.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] chạy migrations..."
  node dist/scripts/migrate.js
fi

exec "$@"
