package mqtt

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/textbee/backend/internal/config"
)

type MessageHandler func(topic string, payload []byte)

type Client struct {
	client  mqtt.Client
	cfg     config.MQTTConfig
	handlers map[string]MessageHandler
	logger  *slog.Logger
}

func NewClient(cfg config.MQTTConfig, logger *slog.Logger) *Client {
	return &Client{
		cfg:      cfg,
		handlers: make(map[string]MessageHandler),
		logger:   logger.With("component", "mqtt"),
	}
}

func (c *Client) Connect() error {
	opts := mqtt.NewClientOptions()
	opts.AddBroker(c.cfg.BrokerURL())
	opts.SetClientID(c.cfg.ClientID)
	opts.SetUsername(c.cfg.Username)
	opts.SetPassword(c.cfg.Password)
	opts.SetCleanSession(false)
	opts.SetAutoReconnect(true)
	opts.SetMaxReconnectInterval(60 * time.Second)
	opts.SetConnectionLostHandler(c.onConnectionLost)
	opts.SetOnConnectHandler(c.onConnected)

	// Last Will and Testament: publish offline status if backend disconnects unexpectedly
	willPayload, _ := json.Marshal(map[string]interface{}{
		"status":  "backend_offline",
		"message": "backend service disconnected",
		"ts":      time.Now().Unix(),
	})
	opts.SetWill("backend/status", string(willPayload), byte(c.cfg.QoS), true)

	// Use configurable keepalive and ping timeout
	keepAlive := c.cfg.KeepAlive
	if keepAlive <= 0 {
		keepAlive = 30 * time.Second
	}
	pingTimeout := c.cfg.PingTimeout
	if pingTimeout <= 0 {
		pingTimeout = 10 * time.Second
	}
	opts.SetKeepAlive(keepAlive)
	opts.SetPingTimeout(pingTimeout)

	// Configure TLS if enabled
	if c.cfg.UseTLS {
		tlsCfg := &tls.Config{
			InsecureSkipVerify: c.cfg.TLSInsecure,
		}
		if c.cfg.CACert != "" {
			pemData, err := os.ReadFile(c.cfg.CACert)
			if err != nil {
				return fmt.Errorf("mqtt read CA cert: %w", err)
			}
			rootCAs, err := x509.SystemCertPool()
			if err != nil {
				rootCAs = x509.NewCertPool()
			}
			if !rootCAs.AppendCertsFromPEM(pemData) {
				return fmt.Errorf("mqtt parse CA cert: no valid PEM data")
			}
			tlsCfg.RootCAs = rootCAs
		}
		// If no CA cert specified, don't override RootCAs — let Go use system defaults
		opts.SetTLSConfig(tlsCfg)
		c.logger.Info("MQTT TLS enabled", "insecure_skip_verify", c.cfg.TLSInsecure)
	}

	client := mqtt.NewClient(opts)
	if token := client.Connect(); token.Wait() && token.Error() != nil {
		return fmt.Errorf("mqtt connect: %w", token.Error())
	}

	c.client = client
	return nil
}

func (c *Client) Disconnect() {
	if c.client != nil && c.client.IsConnected() {
		c.client.Disconnect(250)
	}
}

func (c *Client) Publish(ctx context.Context, topic string, payload interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}

	token := c.client.Publish(topic, c.cfg.QoS, false, data)
	if !token.WaitTimeout(5 * time.Second) {
		return fmt.Errorf("publish timeout on topic %s", topic)
	}
	return token.Error()
}

func (c *Client) Subscribe(topic string, handler MessageHandler) error {
	c.handlers[topic] = handler

	token := c.client.Subscribe(topic, c.cfg.QoS, func(client mqtt.Client, msg mqtt.Message) {
		if h, ok := c.handlers[msg.Topic()]; ok {
			h(msg.Topic(), msg.Payload())
		}
	})
	token.Wait()
	return token.Error()
}

func (c *Client) Unsubscribe(topic string) error {
	delete(c.handlers, topic)
	token := c.client.Unsubscribe(topic)
	token.Wait()
	return token.Error()
}

func (c *Client) SendSMSCommand(ctx context.Context, deviceID, msgID, accountID, recipient, message, priority string) error {
	topic := fmt.Sprintf("devices/%s/commands", deviceID)
	payload := map[string]interface{}{
		"action":     "send_sms",
		"id":         msgID,
		"account_id": accountID,
		"recipient":  recipient,
		"message":    message,
		"priority":   priority,
		"timestamp":  time.Now().Unix(),
	}
	return c.Publish(ctx, topic, payload)
}

func (c *Client) SendPong(ctx context.Context, deviceID string) error {
	topic := fmt.Sprintf("devices/%s/pong", deviceID)
	payload := map[string]interface{}{
		"action":    "pong",
		"device_id": deviceID,
		"timestamp": time.Now().Unix(),
	}
	return c.Publish(ctx, topic, payload)
}

func (c *Client) onConnectionLost(client mqtt.Client, err error) {
	c.logger.Error("MQTT connection lost", "error", err)
}

func (c *Client) onConnected(client mqtt.Client) {
	c.logger.Info("MQTT connected/reconnected")
	// Publish online status on connect/reconnect
	statusPayload, _ := json.Marshal(map[string]interface{}{
		"status":  "backend_online",
		"message": "backend service connected",
		"ts":      time.Now().Unix(),
	})
	client.Publish("backend/status", byte(c.cfg.QoS), true, statusPayload)
}

func (c *Client) IsConnected() bool {
	return c.client != nil && c.client.IsConnected()
}

func (c *Client) DeviceCommandTopic(deviceID string) string {
	return fmt.Sprintf("devices/%s/commands", deviceID)
}

func (c *Client) DeviceStatusTopic(deviceID string) string {
	return fmt.Sprintf("devices/%s/status", deviceID)
}

func (c *Client) DeviceInboxTopic(deviceID string) string {
	return fmt.Sprintf("devices/%s/inbox", deviceID)
}

func (c *Client) DevicePingTopic(deviceID string) string {
	return fmt.Sprintf("devices/%s/ping", deviceID)
}

func (c *Client) DevicePongTopic(deviceID string) string {
	return fmt.Sprintf("devices/%s/pong", deviceID)
}

func (c *Client) DeviceAckTopic(deviceID string) string {
	return fmt.Sprintf("devices/%s/ack", deviceID)
}
