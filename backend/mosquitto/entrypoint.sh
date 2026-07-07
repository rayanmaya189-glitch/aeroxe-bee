#!/bin/sh
set -e

PASSWD_DIR="/mosquitto/auth"
PASSWD_FILE="$PASSWD_DIR/passwords"

mkdir -p "$PASSWD_DIR"

BACKEND_PASS="${MQTT_BACKEND_PASSWORD:-dev-backend-password}"

# Remove any existing password file
rm -f "$PASSWD_FILE"

# Create hashed password file with backend admin user
# -b = batch mode (no prompts), -c = create new file
mosquitto_passwd -b -c "$PASSWD_FILE" backend "$BACKEND_PASS"

# Fix ownership and permissions (mosquitto user = UID 1883)
chown 1883:1883 "$PASSWD_FILE"
chmod 0644 "$PASSWD_FILE"

# Ensure ACL and data directories have correct ownership for mosquitto user
chown 1883:1883 /mosquitto/auth/acl 2>/dev/null || true
chmod 0644 /mosquitto/auth/acl 2>/dev/null || true
chown -R 1883:1883 /mosquitto/data 2>/dev/null || true

echo "[auth] Password file and ACL configured successfully"

# Start inotify watcher in background to reload Mosquitto when the password file
# is updated by the backend (which shares this volume).
# Watches for modify events and sends SIGHUP to the mosquitto process.
while true; do
    inotifywait -e modify "$PASSWD_FILE" 2>/dev/null
    kill -HUP $(pidof mosquitto) 2>/dev/null || true
    echo "[auth] Password file changed, sent SIGHUP to Mosquitto"
done &

# Drop to mosquitto user (UID 1883) before starting the broker
exec su-exec 1883 "$@"
