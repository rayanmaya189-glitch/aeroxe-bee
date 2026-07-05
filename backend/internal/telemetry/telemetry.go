package telemetry

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/aeroxe-bee/backend/internal/config"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
	"go.opentelemetry.io/otel/trace"
)

type Metrics struct {
	MessagesSent        prometheus.Counter
	MessagesDelivered   prometheus.Counter
	MessagesFailed      prometheus.Counter
	QueueDepth          *prometheus.GaugeVec
	DeviceUptime        *prometheus.GaugeVec
	CarrierFailureRate  *prometheus.GaugeVec
	CircuitBreakerState *prometheus.GaugeVec
	MessageLatency      prometheus.Histogram
	APILatency          *prometheus.HistogramVec
	ActiveDevices       prometheus.Gauge
	OTPLatency          prometheus.Histogram
	DeliveryConfidence  prometheus.Histogram
	SIMHealthStatus     *prometheus.GaugeVec
	WorkersActive       prometheus.Gauge
	QueueProcessed      *prometheus.CounterVec

	// FCM token lifecycle metrics
	FCMTokensPruned     prometheus.Counter
	FCMTokensInvalidated prometheus.Counter
	FCMSendsTotal       *prometheus.CounterVec
}

func NewMetrics() *Metrics {
	return &Metrics{
		MessagesSent: promauto.NewCounter(prometheus.CounterOpts{
			Name: "aeroxebee_messages_sent_total",
			Help: "Total messages sent from API",
		}),
		MessagesDelivered: promauto.NewCounter(prometheus.CounterOpts{
			Name: "aeroxebee_messages_delivered_total",
			Help: "Total messages confirmed delivered",
		}),
		MessagesFailed: promauto.NewCounter(prometheus.CounterOpts{
			Name: "aeroxebee_messages_failed_total",
			Help: "Total messages failed permanently",
		}),
		QueueDepth: promauto.NewGaugeVec(prometheus.GaugeOpts{
			Name: "aeroxebee_queue_depth",
			Help: "Current queue depth per priority lane",
		}, []string{"lane"}),
		DeviceUptime: promauto.NewGaugeVec(prometheus.GaugeOpts{
			Name: "aeroxebee_device_uptime_ratio",
			Help: "24h uptime ratio per device",
		}, []string{"device_id", "carrier"}),
		CarrierFailureRate: promauto.NewGaugeVec(prometheus.GaugeOpts{
			Name: "aeroxebee_carrier_failure_rate",
			Help: "Rolling failure rate per carrier",
		}, []string{"carrier"}),
		CircuitBreakerState: promauto.NewGaugeVec(prometheus.GaugeOpts{
			Name: "aeroxebee_circuit_breaker_state",
			Help: "Circuit breaker state: 0=closed 1=half-open 2=open",
		}, []string{"scope", "scope_value"}),
		MessageLatency: promauto.NewHistogram(prometheus.HistogramOpts{
			Name:    "aeroxebee_message_latency_seconds",
			Help:    "End-to-end message delivery latency",
			Buckets: []float64{0.5, 1, 2, 3, 5, 10, 30, 60, 120},
		}),
		APILatency: promauto.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "aeroxebee_api_latency_seconds",
			Help:    "API request latency by endpoint",
			Buckets: prometheus.DefBuckets,
		}, []string{"method", "path", "status"}),
		ActiveDevices: promauto.NewGauge(prometheus.GaugeOpts{
			Name: "aeroxebee_active_devices",
			Help: "Number of devices currently ONLINE",
		}),
		OTPLatency: promauto.NewHistogram(prometheus.HistogramOpts{
			Name:    "aeroxebee_otp_latency_seconds",
			Help:    "OTP delivery latency",
			Buckets: []float64{0.5, 1, 2, 3, 5, 10, 30},
		}),
		DeliveryConfidence: promauto.NewHistogram(prometheus.HistogramOpts{
			Name:    "aeroxebee_delivery_confidence",
			Help:    "Delivery confidence score distribution",
			Buckets: []float64{0.1, 0.3, 0.5, 0.7, 0.9, 0.95, 0.99},
		}),
		SIMHealthStatus: promauto.NewGaugeVec(prometheus.GaugeOpts{
			Name: "aeroxebee_sim_health_status",
			Help: "SIM health 0=healthy 1=degraded 2=blocked",
		}, []string{"device_id", "carrier"}),
		WorkersActive: promauto.NewGauge(prometheus.GaugeOpts{
			Name: "aeroxebee_workers_active",
			Help: "Number of active worker goroutines",
		}),
		QueueProcessed: promauto.NewCounterVec(prometheus.CounterOpts{
			Name: "aeroxebee_queue_processed_total",
			Help: "Messages processed from queue by lane",
		}, []string{"lane", "status"}),

		// FCM token lifecycle metrics
		FCMTokensPruned: promauto.NewCounter(prometheus.CounterOpts{
			Name: "aeroxebee_fcm_tokens_pruned_total",
			Help: "Total FCM tokens pruned (>30 days inactive or marked invalid)",
		}),
		FCMTokensInvalidated: promauto.NewCounter(prometheus.CounterOpts{
			Name: "aeroxebee_fcm_tokens_invalidated_total",
			Help: "Total FCM tokens invalidated by FCM UNREGISTERED/INVALID_ARGUMENT errors",
		}),
		FCMSendsTotal: promauto.NewCounterVec(prometheus.CounterOpts{
			Name: "aeroxebee_fcm_sends_total",
			Help: "Total FCM push notification attempts",
		}, []string{"status"}), // status: success, invalid_token, error
	}
}

func (m *Metrics) ObserveMessageSent() {
	m.MessagesSent.Inc()
}

func (m *Metrics) ObserveMessageDelivered(confidence float64) {
	m.MessagesDelivered.Inc()
	m.DeliveryConfidence.Observe(confidence)
}

func (m *Metrics) ObserveMessageFailed() {
	m.MessagesFailed.Inc()
}

func (m *Metrics) ObserveQueueDepth(lane string, depth int64) {
	m.QueueDepth.WithLabelValues(lane).Set(float64(depth))
}

func (m *Metrics) ObserveAPILatency(method, path string, status int, duration time.Duration) {
	m.APILatency.WithLabelValues(method, path, fmt.Sprintf("%d", status)).Observe(duration.Seconds())
}

func (m *Metrics) ObserveMessageLatency(duration time.Duration) {
	m.MessageLatency.Observe(duration.Seconds())
}

func (m *Metrics) ObserveOTPLatency(duration time.Duration) {
	m.OTPLatency.Observe(duration.Seconds())
}

func (m *Metrics) ObserveCircuitBreakerState(scope, value string, state int) {
	m.CircuitBreakerState.WithLabelValues(scope, value).Set(float64(state))
}

func (m *Metrics) ObserveDeviceHealth(deviceID, carrier string, state int) {
	m.SIMHealthStatus.WithLabelValues(deviceID, carrier).Set(float64(state))
}

func (m *Metrics) ObserveQueueProcessed(lane string, success bool) {
	status := "success"
	if !success {
		status = "failed"
	}
	m.QueueProcessed.WithLabelValues(lane, status).Inc()
}

type Logger struct {
	*slog.Logger
}

func NewLogger(level, format string) *Logger {
	var lvl slog.Level
	switch level {
	case "debug":
		lvl = slog.LevelDebug
	case "info":
		lvl = slog.LevelInfo
	case "warn":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}

	var handler slog.Handler
	opts := &slog.HandlerOptions{Level: lvl}
	if format == "json" {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	return &Logger{slog.New(handler)}
}

func (l *Logger) WithComponent(component string) *Logger {
	return &Logger{l.With("component", component)}
}

func (l *Logger) WithTraceID(traceID string) *Logger {
	return &Logger{l.With("trace_id", traceID)}
}

type Tracer struct {
	provider *sdktrace.TracerProvider
	tracer   trace.Tracer
	enabled  bool
}

func NewTracer(cfg config.TelemetryConfig) *Tracer {
	if !cfg.TracingEnabled {
		return &Tracer{enabled: false}
	}

	exporter, err := otlptracehttp.New(context.Background(),
		otlptracehttp.WithEndpoint(cfg.TracingEndpoint),
		otlptracehttp.WithInsecure(),
	)
	if err != nil {
		return &Tracer{enabled: false}
	}

	res := resource.NewWithAttributes(
		semconv.SchemaURL,
		semconv.ServiceName(cfg.ServiceName),
		attribute.String("environment", os.Getenv("APP_ENV")),
	)

	provider := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.TraceIDRatioBased(cfg.TracingRatio)),
	)

	otel.SetTracerProvider(provider)

	return &Tracer{
		provider: provider,
		tracer:   provider.Tracer(cfg.ServiceName),
		enabled:  true,
	}
}

func (t *Tracer) StartSpan(ctx context.Context, name string, opts ...trace.SpanStartOption) (context.Context, trace.Span) {
	if !t.enabled || t.tracer == nil {
		return ctx, trace.SpanFromContext(ctx)
	}
	return t.tracer.Start(ctx, name, opts...)
}

func (t *Tracer) Shutdown(ctx context.Context) error {
	if t.provider != nil {
		return t.provider.Shutdown(ctx)
	}
	return nil
}

func (m *Metrics) ObserveFCMTokensPruned(count int64) {
	m.FCMTokensPruned.Add(float64(count))
}

func (m *Metrics) ObserveFCMTokenInvalidated() {
	m.FCMTokensInvalidated.Inc()
}

func (m *Metrics) ObserveFCMSend(status string) {
	m.FCMSendsTotal.WithLabelValues(status).Inc()
}

func FormatDuration(d time.Duration) string {
	if d < time.Microsecond {
		return fmt.Sprintf("%dns", d.Nanoseconds())
	} else if d < time.Millisecond {
		return fmt.Sprintf("%dµs", d.Microseconds())
	} else if d < time.Second {
		return fmt.Sprintf("%dms", d.Milliseconds())
	}
	return d.Round(time.Millisecond).String()
}
