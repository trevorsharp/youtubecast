#!/bin/sh
set -e

# Shared runtime entrypoint for the Docker image, `nix run .` and the NixOS
# service. it fills the placeholders in $NGINX_CONF (see nginx.conf) and then
# starts nginx in the foreground alongside the Bun app.

APP_DIR="${APP_DIR:-/app}"

# CONFIG_BASE holds the app's writable config folder (settings.json,
# cookies.txt) and is the parent of the content folder. The NixOS module and
# the Docker image set it explicitly; otherwise fall back to the Docker layout
# (/app) when it is writable and to the XDG state directory otherwise (the
# package's /app is a read-only nix store path).
if [ -z "${CONFIG_BASE:-}" ]; then
	if [ -w "$APP_DIR" ]; then
		CONFIG_BASE="$APP_DIR"
	else
		CONFIG_BASE="${XDG_STATE_HOME:-$HOME/.local/state}/youtubecast/runtime"
	fi
fi
export CONFIG_BASE

CONTENT_DIR="${CONTENT_DIR:-$CONFIG_BASE/content}"
export CONTENT_DIR

mkdir -p "$CONTENT_DIR" "$CONFIG_BASE/config"

# The app looks for downloaded media in $CONFIG_BASE/content; link it back to
# the real content directory when the module keeps them apart.
if [ ! -e "$CONFIG_BASE/content" ] && [ ! -L "$CONFIG_BASE/content" ]; then
	ln -s "$CONTENT_DIR" "$CONFIG_BASE/content"
fi

# nginx needs a pid file and log files it can actually write, so pick a
# writable runtime directory (the NixOS service passes /run/youtubecast).
if [ -z "${NGINX_RUNTIME_DIR:-}" ]; then
	if [ -w /run ]; then
		NGINX_RUNTIME_DIR=/run/youtubecast
	else
		NGINX_RUNTIME_DIR="${TMPDIR:-/tmp}/youtubecast"
	fi
fi
mkdir -p "$NGINX_RUNTIME_DIR"

NGINX_PORT="${YOUTUBECAST_PORT:-3000}"
NGINX_BIND_ADDRESS="${YOUTUBECAST_BIND_ADDRESS:-0.0.0.0}"
NGINX_CONF="${NGINX_CONF:-$APP_DIR/nginx.conf}"

NGINX_RUNTIME_CONF="$NGINX_RUNTIME_DIR/nginx.conf"
sed \
	-e "s|\${port}|$NGINX_PORT|g" \
	-e "s|\${bindAddress}|$NGINX_BIND_ADDRESS|g" \
	-e "s|\${configBase}|$CONFIG_BASE|g" \
	-e "s|\${runtimeDir}|$NGINX_RUNTIME_DIR|g" \
	"$NGINX_CONF" >"$NGINX_RUNTIME_CONF"

# Never hand nginx a conf that still contains a placeholder it will choke on.
if grep -q '\${' "$NGINX_RUNTIME_CONF"; then
	echo "Unsubstituted placeholder left in nginx config: $(grep -m1 '\${' "$NGINX_RUNTIME_CONF")" >&2
	exit 1
fi

nginx -c "$NGINX_RUNTIME_CONF" -g 'daemon off;' &

# Source is in the package; config is read from CONFIG_BASE
exec bun run "$APP_DIR/src/index.ts"
