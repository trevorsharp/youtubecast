#!/usr/bin/env bash
set -e

APP_DIR="${APP_DIR:-/app}"
CONTENT_DIR="${YOUTUBECAST_CONTENT_DIR:-/var/lib/youtubecast}"
NGINX_PORT="${YOUTUBECAST_PORT:-3000}"

# Create content directory if it doesn't exist
mkdir -p "$CONTENT_DIR"

# Start nginx using the system config (symlinked from /etc/youtubecast/nginx.conf)
NGINX_RUNTIME_CONF="/tmp/youtubecast-nginx.conf"
sed "s/\${port}/$NGINX_PORT/" "$NGINX_CONF" >"$NGINX_RUNTIME_CONF"

nginx -c "$NGINX_RUNTIME_CONF" -g "daemon off;" &

# Start Bun application (source is in the package, config is read from CONFIG_BASE)
exec bun run "${APP_DIR}/src/index.ts"
