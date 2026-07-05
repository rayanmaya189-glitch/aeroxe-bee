package deliveryconf

import (
	"github.com/aeroxe-bee/backend/internal/config"
	"github.com/aeroxe-bee/backend/internal/models"
)

type Engine struct {
	reportWeight     float64
	historicalWeight float64
	carrierWeight    float64
}

func NewEngine(cfg config.DeliveryConfig) *Engine {
	return &Engine{
		reportWeight:     cfg.DeliveryReportWeight,
		historicalWeight: cfg.HistoricalPatternWeight,
		carrierWeight:    cfg.CarrierReliabilityWeight,
	}
}

type ConfidenceInput struct {
	HasDeliveryReport         bool
	CarrierReturnsReceipts    bool
	HistoricalSuccessRate     float64
	CarrierReliability        float64
	DeviceHistoricalCorrelation float64
}

type ConfidenceResult struct {
	Score          float64
	DeliveryStatus models.DeliveryStatus
	Breakdown      ConfidenceBreakdown
}

type ConfidenceBreakdown struct {
	DeliveryReportContribution  float64 `json:"delivery_report_contribution"`
	HistoricalContribution      float64 `json:"historical_contribution"`
	CarrierReliabilityContribution float64 `json:"carrier_reliability_contribution"`
}

func (e *Engine) Calculate(input ConfidenceInput) ConfidenceResult {
	deliveryReportScore := 0.0
	if input.HasDeliveryReport && input.CarrierReturnsReceipts {
		deliveryReportScore = 1.0
	} else if input.HasDeliveryReport {
		deliveryReportScore = 0.7
	}

	score := (deliveryReportScore * e.reportWeight) +
		(input.HistoricalSuccessRate * e.historicalWeight) +
		(input.CarrierReliability * e.carrierWeight)

	status := models.DeliveryStatusSent
	if score >= 0.9 && input.HasDeliveryReport {
		status = models.DeliveryStatusCarrierAccepted
	} else if score >= 0.7 {
		status = models.DeliveryStatusProbableDelivered
	} else if score < 0.3 {
		status = models.DeliveryStatusFailed
	}

	return ConfidenceResult{
		Score:          score,
		DeliveryStatus: status,
		Breakdown: ConfidenceBreakdown{
			DeliveryReportContribution:  deliveryReportScore * e.reportWeight,
			HistoricalContribution:      input.HistoricalSuccessRate * e.historicalWeight,
			CarrierReliabilityContribution: input.CarrierReliability * e.carrierWeight,
		},
	}
}

func (e *Engine) CalculateFromDevice(device models.Device, hasDeliveryReport bool, carrierReturnsReceipts bool) ConfidenceResult {
	carrierReliability := device.ReputationScore
	if carrierReliability <= 0 {
		carrierReliability = 0.5
	} else if carrierReliability > 1 {
		carrierReliability = 1
	}

	return e.Calculate(ConfidenceInput{
		HasDeliveryReport:         hasDeliveryReport,
		CarrierReturnsReceipts:    carrierReturnsReceipts,
		HistoricalSuccessRate:     device.SuccessRate24h,
		CarrierReliability:        carrierReliability,
		DeviceHistoricalCorrelation: device.ReliabilityScore,
	})
}

func (e *Engine) CalculateDeliveryStatus(confidenceScore float64, hasDeliveryReport bool) models.DeliveryStatus {
	if confidenceScore >= 0.9 && hasDeliveryReport {
		return models.DeliveryStatusCarrierAccepted
	} else if confidenceScore >= 0.7 {
		return models.DeliveryStatusProbableDelivered
	} else if confidenceScore < 0.3 {
		return models.DeliveryStatusFailed
	}
	return models.DeliveryStatusSent
}
