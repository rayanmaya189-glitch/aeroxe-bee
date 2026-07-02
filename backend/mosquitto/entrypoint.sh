#!/bin/sh
set -e

PASSWD_DIR="/mosquitto/auth"
PASSWD_FILE="$PASSWD_DIR/passwords"

mkdir -p "$PASSWD_DIR"

BACKEND_PASS="${MQTT_BACKEND_PASSWORD:-dev-backend-password}"
DEVICE_PASS="${MQTT_DEVICE_PASSWORD:-dev-device-password}"

# Remove any existing password file
rm -f "$PASSWD_FILE"

# Create hashed password file
mosquitto_passwd -b -c "$PASSWD_FILE" backend "$BACKEND_PASS"
mosquitto_passwd -b "$PASSWD_FILE" devices "$DEVICE_PASS"

# Fix ownership and permissions
chown mosquitto:mosquitto "$PASSWD_FILE"
chmod 0700 "$PASSWD_FILE"

echo "[auth] Password file created successfully"

exec /docker-entrypoint.sh "$@"