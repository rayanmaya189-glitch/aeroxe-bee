#!/bin/sh
set -e

PASSWD_DIR="/mosquitto/auth"
PASSWD_FILE="$PASSWD_DIR/passwords"

mkdir -p "$PASSWD_DIR"

BACKEND_PASS="${MQTT_BACKEND_PASSWORD:-dev-backend-password}"
DEVICE_PASS="${MQTT_DEVICE_PASSWORD:-dev-device-password}"

# Remove any existing password file
rm -f "$PASSWD_FILE"

# Create hashed password file with backend admin user
mosquitto_passwd -b -c "$PASSWD_FILE" backend "$BACKEND_PASS"

# Fix ownership and permissions
chown mosquitto:mosquitto "$PASSWD_FILE"
chmod 0700 "$PASSWD_FILE"

echo "[auth] Password file created successfully (backend user only)"
echo "[auth] Device users are managed dynamically by the Go backend service"

# Write PID file so the backend can signal reload via SIGHUP
echo $$ > /mosquitto/mosquitto.pid
chown mosquitto:mosquitto /mosquitto/mosquitto.pid

exec /docker-entrypoint.sh "$@"
