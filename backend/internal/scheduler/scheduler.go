package scheduler

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/aeroxe-bee/backend/internal/encryption"
	"github.com/aeroxe-bee/backend/internal/services"
	"github.com/aeroxe-bee/backend/internal/worker"
)

// Scheduler polls for due scheduled messages and enqueues them for delivery.
type Scheduler struct {
	messageService *services.MessageService
	queue          *worker.Queue
	encryption     *encryption.Manager
	logger         *slog.Logger
	stopCh         chan struct{}
	pollInterval   time.Duration
	batchSize      int
}

func New(
	messageService *services.MessageService,
	queue *worker.Queue,
	encryption *encryption.Manager,
	logger *slog.Logger,
) *Scheduler {
	poll := 5 * time.Second
	return &Scheduler{
		messageService: messageService,
		queue:          queue,
		encryption:     encryption,
		logger:         logger.With("component", "scheduler"),
		stopCh:         make(chan struct{}),
		pollInterval:   poll,
		batchSize:      50,
	}
}

// Start begins polling for due scheduled messages.
func (s *Scheduler) Start(ctx context.Context) {
	s.logger.Info("scheduler started", "poll_interval", s.pollInterval)
	ticker := time.NewTicker(s.pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopCh:
			s.logger.Info("scheduler stopped")
			return
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.processDue(ctx)
		}
	}
}

// Stop signals the scheduler to stop.
func (s *Scheduler) Stop() {
	close(s.stopCh)
}

func (s *Scheduler) processDue(ctx context.Context) {
	now := time.Now()
	msgs, err := s.messageService.GetScheduledMessages(ctx, now, s.batchSize)
	if err != nil {
		s.logger.Error("failed to fetch scheduled messages", "error", err)
		return
	}

	for _, msg := range msgs {
		if msg.ScheduledAt != nil && msg.ScheduledAt.After(now) {
			continue
		}

		var lane worker.PriorityLane
		var maxAge time.Duration
		switch msg.MessageType {
		case "otp":
			lane = worker.LaneOTP
			maxAge = 90 * time.Second
		case "marketing":
			lane = worker.LaneMarketing
		default:
			lane = worker.LaneTransactional
			maxAge = 15 * time.Minute
		}

		// Decrypt the message body before enqueuing
		var plaintext string
		if s.encryption != nil && len(msg.EncryptedMessage) > 0 {
			dec, err := s.encryption.Decrypt(string(msg.EncryptedMessage))
			if err != nil {
				s.logger.Error("failed to decrypt scheduled message body", "msg_id", msg.ID, "error", err)
				continue
			}
			plaintext = string(dec)
		} else {
			plaintext = string(msg.EncryptedMessage)
		}

		// Release from scheduled status (idempotent)
		if err := s.messageService.ReleaseScheduled(ctx, msg.ID); err != nil {
			s.logger.Error("failed to release scheduled message", "msg_id", msg.ID, "error", err)
			continue
		}

		queueMsg := worker.QueueMessage{
			ID:              msg.ID,
			AccountID:       "",
			APIKeyID:        msg.APIKeyID,
			Recipient:       msg.Recipient,
			Sender:          msg.Sender,
			Message:         plaintext,
			MessageType:     msg.MessageType,
			Priority:        lane,
			IdempotencyKey:  msg.IdempotencyKey,
			CreatedAt:       msg.CreatedAt,
			RoutingStrategy: msg.RoutingStrategyUsed,
			MaxAge:          maxAge,
		}

		_, err := s.queue.Enqueue(ctx, lane, queueMsg)
		if err != nil {
			s.logger.Error("failed to enqueue scheduled message", "msg_id", msg.ID, "error", err)
			if revertErr := s.messageService.ReleaseScheduled(ctx, msg.ID); revertErr != nil {
				s.logger.Error("failed to revert message to scheduled", "msg_id", msg.ID, "error", revertErr)
			}
			continue
		}

		s.logger.Info("scheduled message released", "msg_id", msg.ID, "lane", lane)
	}

	s.logger.Debug(fmt.Sprintf("scheduler processed %d due messages", len(msgs)))
}
