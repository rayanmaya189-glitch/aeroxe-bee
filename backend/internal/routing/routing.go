package routing

import (
	"math"
	"sort"

	"github.com/aeroxe-bee/backend/internal/models"
)

type Strategy struct {
	Name models.RoutingStrategy
}

// FIFO is the single routing strategy now.
var FIFO = Strategy{
	Name: models.RoutingStrategyFIFO,
}

type ScoredDevice struct {
	Device             models.Device
	TotalScore         float64
	ReliabilityContrib float64
	ReputationContrib  float64
	CostContrib        float64
	LatencyContrib     float64
	GeoContrib         float64
}

type Selector struct {
}

func NewSelector() *Selector {
	return &Selector{}
}

func (s *Selector) ScoreDevice(device models.Device, costPerSMS float64, recipientCountry string) ScoredDevice {
	// FIFO ordering: score by reliability only (higher is better), no strategy weights
	normalizedLatency := 1.0 - (device.AvgLatencyMs / 10000.0)
	if normalizedLatency < 0 {
		normalizedLatency = 0
	}

	normalizedCost := 1.0 - (costPerSMS / 0.1)
	if normalizedCost < 0 {
		normalizedCost = 0
	}

	geoScore := 0.5
	if recipientCountry != "" {
		if device.CountryCode == recipientCountry {
			geoScore = 1.0
		} else {
			geoScore = 0.3
		}
	}

	// Simple FIFO: weight by reliability and reputation equally
	totalScore := (device.ReliabilityScore * 0.4) +
		(device.ReputationScore * 0.3) +
		(normalizedCost * 0.1) +
		(normalizedLatency * 0.1) +
		(geoScore * 0.1)

	return ScoredDevice{
		Device:             device,
		TotalScore:         totalScore,
		ReliabilityContrib: device.ReliabilityScore * 0.4,
		ReputationContrib:  device.ReputationScore * 0.3,
		CostContrib:        normalizedCost * 0.1,
		LatencyContrib:     normalizedLatency * 0.1,
		GeoContrib:         geoScore * 0.1,
	}
}

func (s *Selector) SelectDevices(devices []models.Device, costMap map[string]float64, recipientCountry string, limit int) []ScoredDevice {
	scored := make([]ScoredDevice, 0, len(devices))
	for _, d := range devices {
		scored = append(scored, s.ScoreDevice(d, costMap[d.ID], recipientCountry))
	}

	sort.Slice(scored, func(i, j int) bool {
		return scored[i].TotalScore > scored[j].TotalScore
	})

	if len(scored) > limit {
		scored = scored[:limit]
	}
	return scored
}

type DeviceOptions struct {
	RecipientCountry string
	MaxResults       int
	ExcludeBlocked   bool
	ExcludeDegraded  bool
	RequireOnline    bool
}

func (s *Selector) FilterAndScore(devices []models.Device, opts DeviceOptions, costMap map[string]float64) []ScoredDevice {
	eligible := make([]models.Device, 0, len(devices))
	for _, d := range devices {
		if opts.RequireOnline && d.Status != models.DeviceStatusOnline {
			continue
		}
		if opts.ExcludeBlocked && d.SIMHealthStatus == models.SIMHealthBlocked {
			continue
		}
		if opts.ExcludeDegraded && d.SIMHealthStatus == models.SIMHealthDegraded {
			continue
		}
		eligible = append(eligible, d)
	}

	if len(eligible) == 0 {
		return nil
	}

	return s.SelectDevices(eligible, costMap, opts.RecipientCountry, opts.MaxResults)
}

func (s *Selector) CalculateReliabilityScore(successRate, uptimeRatio, avgLatencyMs, capacityRatio float64) float64 {
	normalizedLatency := 1.0 - (avgLatencyMs / 10000.0)
	if normalizedLatency < 0 {
		normalizedLatency = 0
	}
	return (successRate * 0.4) + (uptimeRatio * 0.2) + (normalizedLatency * 0.2) + (capacityRatio * 0.2)
}

func (s *Selector) CalculateReputationScore(complaintRate, deliveryTrendStability, blockEventFreq, fraudFlagWeight float64) float64 {
	return (1-complaintRate)*0.4 + deliveryTrendStability*0.3 + (1-blockEventFreq)*0.2 + (1-fraudFlagWeight)*0.1
}

func (s *Selector) CalculateComplaintRate(complaintCount, totalSent int64) float64 {
	if totalSent == 0 {
		return 0
	}
	return math.Min(float64(complaintCount)/float64(totalSent), 1.0)
}

func (s *Selector) CalculateBlockEventFrequency(blockEventCount int64, totalSent int64) float64 {
	if totalSent == 0 {
		return 0
	}
	return math.Min(float64(blockEventCount)/float64(totalSent)*100, 1.0)
}
