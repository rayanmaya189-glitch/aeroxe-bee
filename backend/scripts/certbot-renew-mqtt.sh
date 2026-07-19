#!/bin/bash
# ============================================================================
# AeroXe Bee - Certbot Renewal Hook for Mosquitto MQTT
# Aeroxe Enterprises Pvt. Ltd., Jalgaon, Maharashtra, India
#
# Install: sudo ln -s /root/projects/aeroxe-bee/backend/scripts/certbot-renew-mqtt.sh \
#          /etc/letsencrypt/renewal-hooks/deploy/mqtt-reload.sh
#
# When certbot renews bee-mqtt.nexoracrms.com certs, this script sends SIGHUP
# to the Mosquitto container so it reloads TLS certificates on new connections.
# No full restart needed — Mosquitto re-reads certs per-connection.
# ============================================================================

set -e

CONTAINER_NAME="aeroxe-bee-mosquitto-1"
LOG_TAG="[certbot-mqtt]"

echo "$LOG_TAG Certificate renewed for $RENEWED_DOMAINS"
echo "$LOG_TAG Reloading Mosquitto TLS certificates..."

# Send SIGHUP to Mosquitto to reload config/certs gracefully
docker kill --signal=HUP "$CONTAINER_NAME" 2>/dev/null && \
    echo "$LOG_TAG Mosquitto reloaded successfully" || \
    echo "$LOG_TAG WARNING: Could not signal Mosquitto container (may not be running)"

echo "$LOG_TAG Done"
