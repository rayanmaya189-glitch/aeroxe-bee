package mqtt

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
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
	opts.SetMaxReconnectInterval(30 * time.Second)
	opts.SetConnectionLostHandler(c.onConnectionLost)
	opts.SetOnConnectHandler(c.onConnected)
	opts.SetKeepAlive(30 * time.Second)
	opts.SetPingTimeout(10 * time.Second)

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

func (c *Client) SendSMSCommand(ctx context.Context, deviceID string, recipient string, message string) error {
	topic := fmt.Sprintf("devices/%s/commands", deviceID)
	payload := map[string]interface{}{
		"action":    "send_sms",
		"recipient": recipient,
		"message":   message,
		"timestamp": time.Now().Unix(),
	}
	return c.Publish(ctx, topic, payload)
}

func (c *Client) SendPing(ctx context.Context, deviceID string) error {
	topic := fmt.Sprintf("devices/%s/ping", deviceID)
	payload := map[string]interface{}{
		"action":    "ping",
		"timestamp": time.Now().Unix(),
	}
	return c.Publish(ctx, topic, payload)
}

func (c *Client) onConnectionLost(client mqtt.Client, err error) {
	c.logger.Error("MQTT connection lost", "error", err)
}

func (c *Client) onConnected(client mqtt.Client) {
	c.logger.Info("MQTT connected")
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
