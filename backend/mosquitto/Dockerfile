# ============================================================================
# AeroXe Bee - Mosquitto MQTT Broker
# Aeroxe Enterprises Pvt. Ltd., Jalgaon, Maharashtra, India
# Authentication via password file managed by the backend Go service
# ============================================================================

FROM eclipse-mosquitto:2

# Install su-exec for privilege dropping and inotify-tools for password file watch
RUN apk add --no-cache su-exec inotify-tools

# Create all required directories with correct ownership
# The mosquitto user in eclipse-mosquitto:2 has UID 1883
RUN mkdir -p /mosquitto/auth /mosquitto/data /mosquitto/config && \
    chown -R 1883:1883 /mosquitto && \
    chmod 755 /mosquitto/auth /mosquitto/data /mosquitto/config

# Copy the custom entrypoint that generates the backend admin password at startup
COPY mosquitto/entrypoint.sh /usr/local/bin/mosquitto-wrapper.sh
RUN chmod +x /usr/local/bin/mosquitto-wrapper.sh

# Run as root temporarily so entrypoint can create password file,
# then drop to mosquitto user via the CMD
USER root

ENTRYPOINT ["/usr/local/bin/mosquitto-wrapper.sh"]
CMD ["/usr/sbin/mosquitto", "-c", "/mosquitto/config/mosquitto.conf"]
