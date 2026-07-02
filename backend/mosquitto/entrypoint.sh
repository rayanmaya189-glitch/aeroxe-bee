#!/bin/sh
# ============================================================================
# AeroXe Bee - Mosquitto Entrypoint
# Creates 2 static MQTT credentials:
#   1. "backend"   — Go backend service (full access to all device topics)
#   2. "devices"   — Shared by all Android devices (subscribe to own topic tree)
# Then starts Mosquitto.
# ============================================================================

set -e

PASSWD_DIR="/mosquitto/auth"
PASSWD_FILE="$PASSWD_DIR/passwords"

mkdir -p "$PASSWD_DIR"

# Build password file with both static users
# Mosquitto reads plaintext here and hashes at load time
cat > "$PASSWD_FILE" <<EOF
# Backend service — full read/write to all device topics
# (see acl file for topic permissions)
backend:${MQTT_BACKEND_PASSWORD:-dev-backend-password}
# All member devices share these credentials
# Each device subscribes to its own topic: devices/{device_id}/#
devices:${MQTT_DEVICE_PASSWORD:-dev-device-password}
EOF

echo "[auth] Password file written to $PASSWD_FILE with backend + devices users"

# Start Mosquitto
exec /docker-entrypoint.sh "$@"
