# ============================================================================
# AeroXe Bee - Mosquitto MQTT Broker
# Authentication via password file managed by the backend Go service
# ============================================================================

FROM eclipse-mosquitto:2

# Create directory for the backend-managed password file
RUN mkdir -p /mosquitto/auth && chmod 755 /mosquitto/auth

# Copy the custom entrypoint that generates the backend admin password at startup
COPY mosquitto/entrypoint.sh /usr/local/bin/mosquitto-wrapper.sh
RUN chmod +x /usr/local/bin/mosquitto-wrapper.sh
ENTRYPOINT ["/usr/local/bin/mosquitto-wrapper.sh"]
