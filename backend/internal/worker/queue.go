package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/aeroxe-bee/backend/internal/config"
	"github.com/aeroxe-bee/backend/internal/models"
)

type Priority int

const (
	PriorityOTP Priority = iota
	PriorityTransactional
	PriorityMarketing
)

type QueueMessage struct {
	ID              string            `json:"id"`
	AccountID       string            `json:"account_id"`
	APIKeyID        string            `json:"api_key_id"`
	Recipient       string            `json:"recipient"`
	Sender          string            `json:"sender"`
	Message         string            `json:"message"`
	MessageType     models.MessageType `json:"message_type"`
	Priority        PriorityLane      `json:"priority"`
	IdempotencyKey  string            `json:"idempotency_key"`
	CreatedAt       time.Time         `json:"created_at"`
	MaxAge          time.Duration     `json:"max_age"`
	Attempts        int               `json:"attempts"`
}

type PriorityLane string

const (
	LaneOTP           PriorityLane = "otp"
	LaneTransactional PriorityLane = "transactional"
	LaneMarketing     PriorityLane = "marketing"
)

type Queue struct {
	client            *redis.Client
	cfg               config.QueueConfig
	streams           map[PriorityLane]string
	mu                sync.Mutex
	logger            *slog.Logger
	consumers         map[string]*Consumer
	stopCh            chan struct{}
	AntiStarvationCnt int
}

func NewQueue(client *redis.Client, cfg config.QueueConfig, logger *slog.Logger) *Queue {
	return &Queue{
		client: client,
		cfg:    cfg,
		streams: map[PriorityLane]string{
			LaneOTP:           cfg.OTPStream,
			LaneTransactional: cfg.TransactionalStream,
			LaneMarketing:     cfg.MarketingStream,
		},
		logger:            logger.With("component", "queue"),
		consumers:         make(map[string]*Consumer),
		stopCh:            make(chan struct{}),
		AntiStarvationCnt: 0,
	}
}

func (q *Queue) Enqueue(ctx context.Context, lane PriorityLane, msg QueueMessage) (string, error) {
	stream, ok := q.streams[lane]
	if !ok {
		return "", fmt.Errorf("unknown lane: %s", lane)
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return "", fmt.Errorf("marshal message: %w", err)
	}

	msgID, err := q.client.XAdd(ctx, &redis.XAddArgs{
		Stream: stream,
		Values: map[string]interface{}{
			"payload":   string(data),
			"created_at": time.Now().Unix(),
			"max_age":   msg.MaxAge.Milliseconds(),
		},
		MaxLen:       int64(q.cfg.MaxQueueDepth),
		Approx:       true,
	}).Result()
	if err != nil {
		return "", fmt.Errorf("xadd to %s: %w", stream, err)
	}

	return msgID, nil
}

func (q *Queue) Dequeue(ctx context.Context, consumerGroup, consumerName string, lanes []PriorityLane) (PriorityLane, *QueueMessage, string, error) {
	for _, lane := range lanes {
		stream := q.streams[lane]

		if lane == LaneMarketing && q.AntiStarvationCnt < q.cfg.AntiStarvationRatio {
			q.AntiStarvationCnt++
			continue
		}
		if lane != LaneOTP {
			q.AntiStarvationCnt = 0
		}

		results, err := q.client.XReadGroup(ctx, &redis.XReadGroupArgs{
			Group:    consumerGroup,
			Consumer: consumerName,
			Streams:  []string{stream, ">"},
			Count:    1,
			Block:    q.cfg.BlockTime,
		}).Result()
		if err == redis.Nil {
			continue
		} else if err != nil {
			return "", nil, "", fmt.Errorf("xreadgroup %s: %w", stream, err)
		}

		if len(results) > 0 && len(results[0].Messages) > 0 {
			msg := results[0].Messages[0]
			msgID := msg.ID

			payloadStr, ok := msg.Values["payload"].(string)
			if !ok {
				q.client.XAck(ctx, stream, consumerGroup, msgID)
				continue
			}

			var queueMsg QueueMessage
			if err := json.Unmarshal([]byte(payloadStr), &queueMsg); err != nil {
				q.client.XAck(ctx, stream, consumerGroup, msgID)
				continue
			}

			return lane, &queueMsg, msgID, nil
		}
	}

	return "", nil, "", nil
}

func (q *Queue) Acknowledge(ctx context.Context, lane PriorityLane, msgID string) error {
	return q.client.XAck(ctx, q.streams[lane], q.cfg.ConsumerGroupName, msgID).Err()
}

func (q *Queue) DeadLetter(ctx context.Context, lane PriorityLane, msg QueueMessage, reason string) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal dead letter: %w", err)
	}
	originalStream := q.streams[lane]
	_, err = q.client.XAdd(ctx, &redis.XAddArgs{
		Stream: q.cfg.DeadLetterStream,
		Values: map[string]interface{}{
			"payload":     string(data),
			"reason":      reason,
			"original_stream": originalStream,
			"failed_at":   time.Now().Unix(),
		},
	}).Result()
	return err
}

func (q *Queue) GetQueueDepth(ctx context.Context, lane PriorityLane) (int64, error) {
	stream := q.streams[lane]
	info, err := q.client.XInfoStream(ctx, stream).Result()
	if err != nil {
		return 0, err
	}
	return int64(info.Length), nil
}

func (q *Queue) GetQueueDepths(ctx context.Context) map[PriorityLane]int64 {
	depths := make(map[PriorityLane]int64)
	for lane := range q.streams {
		depth, err := q.GetQueueDepth(ctx, lane)
		if err == nil {
			depths[lane] = depth
		}
	}
	return depths
}

func (q *Queue) CreateConsumerGroup(ctx context.Context) error {
	for _, stream := range q.streams {
		err := q.client.XGroupCreateMkStream(ctx, stream, q.cfg.ConsumerGroupName, "0").Err()
		if err != nil && err.Error() != "BUSYGROUP Consumer Group name already exists" {
			return fmt.Errorf("create group %s on %s: %w", q.cfg.ConsumerGroupName, stream, err)
		}
	}

	_, err := q.client.XGroupCreateMkStream(ctx, q.cfg.DeadLetterStream, q.cfg.ConsumerGroupName, "0").Result()
	if err != nil && err.Error() != "BUSYGROUP Consumer Group name already exists" {
		return fmt.Errorf("create group on dead letter: %w", err)
	}

	return nil
}

func (q *Queue) ClaimStale(ctx context.Context, consumerName string) error {
	for _, stream := range q.streams {
		pending, err := q.client.XPendingExt(ctx, &redis.XPendingExtArgs{
			Stream:   stream,
			Group:    q.cfg.ConsumerGroupName,
			Start:    "-",
			End:      "+",
			Count:    10,
		}).Result()
		if err != nil {
			continue
		}

		for _, p := range pending {
			if time.Since(time.Unix(0, p.Idle.Nanoseconds())) > q.cfg.IdleRetryThreshold {
				claimed, err := q.client.XClaim(ctx, &redis.XClaimArgs{
					Stream:   stream,
					Group:    q.cfg.ConsumerGroupName,
					Consumer: consumerName,
					MinIdle:  q.cfg.IdleRetryThreshold,
					Messages: []string{p.ID},
				}).Result()
				if err == nil && len(claimed) > 0 {
					q.logger.Info("claimed stale message", "stream", stream, "msg_id", p.ID)
				}
			}
		}
	}
	return nil
}

func (q *Queue) Close() {
	close(q.stopCh)
}

type Consumer struct {
	Queue        *Queue
	Name         string
	Group        string
	Handler      func(context.Context, PriorityLane, *QueueMessage) error
	MaxAttempts  int
	StopCh       chan struct{}
}

func (q *Queue) NewConsumer(name string, handler func(context.Context, PriorityLane, *QueueMessage) error) *Consumer {
	return &Consumer{
		Queue:       q,
		Name:        name,
		Group:       q.cfg.ConsumerGroupName,
		Handler:     handler,
		MaxAttempts: q.cfg.MaxDeliveryAttempts,
		StopCh:      make(chan struct{}),
	}
}

func (c *Consumer) Start(ctx context.Context) {
	c.Queue.logger.Info("starting consumer", "name", c.Name)

	lanes := []PriorityLane{LaneOTP, LaneTransactional, LaneMarketing}

	for {
		select {
		case <-c.StopCh:
			return
		case <-ctx.Done():
			return
		default:
		}

		lane, msg, msgID, err := c.Queue.Dequeue(ctx, c.Group, c.Name, lanes)
		if err != nil {
			c.Queue.logger.Error("dequeue error", "error", err)
			time.Sleep(100 * time.Millisecond)
			continue
		}
		if msg == nil {
			time.Sleep(50 * time.Millisecond)
			continue
		}

		func() {
			msgCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
			defer cancel()

			span := &Span{Name: "process_message", StartTime: time.Now()}

			if err := c.Handler(msgCtx, lane, msg); err != nil {
				msg.Attempts++
				if msg.Attempts >= c.MaxAttempts {
					if dlErr := c.Queue.DeadLetter(msgCtx, lane, *msg, err.Error()); dlErr != nil {
						c.Queue.logger.Error("dead letter error", "error", dlErr)
					}
				}
				c.Queue.logger.Warn("message processing failed",
					"msg_id", msg.ID, "lane", lane, "error", err, "attempts", msg.Attempts)
			} else {
				if ackErr := c.Queue.Acknowledge(msgCtx, lane, msgID); ackErr != nil {
					c.Queue.logger.Error("ack error", "error", ackErr)
				}
			}

			c.Queue.logger.Info("message processed",
				"msg_id", msg.ID, "lane", lane, "duration", span.Elapsed())
		}()
	}
}

func (c *Consumer) Stop() {
	close(c.StopCh)
}

type Span struct {
	Name      string
	StartTime time.Time
}

func (s *Span) Elapsed() time.Duration {
	return time.Since(s.StartTime)
}
