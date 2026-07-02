package routing

import (
	"math"
	"math/rand"
	"sort"

	"github.com/textbee/backend/internal/models"
)

type Strategy struct {
	Name                models.RoutingStrategy
	ReliabilityWeight   float64
	ReputationWeight    float64
	CostWeight          float64
	LatencyWeight       float64
	GeoPreferenceWeight float64
}

var Strategies = map[models.RoutingStrategy]Strategy{
	models.RoutingStrategyFastest: {
		Name:                models.RoutingStrategyFastest,
		LatencyWeight:       0.5,
		ReliabilityWeight:   0.3,
		ReputationWeight:    0.1,
		CostWeight:          0.0,
		GeoPreferenceWeight: 0.1,
	},
	models.RoutingStrategyLowestCost: {
		Name:                models.RoutingStrategyLowestCost,
		CostWeight:          0.5,
		ReliabilityWeight:   0.2,
		ReputationWeight:    0.1,
		LatencyWeight:       0.1,
		GeoPreferenceWeight: 0.1,
	},
	models.RoutingStrategyHighestReliability: {
		Name:                models.RoutingStrategyHighestReliability,
		ReliabilityWeight:   0.5,
		ReputationWeight:    0.2,
		CostWeight:          0.1,
		LatencyWeight:       0.1,
		GeoPreferenceWeight: 0.1,
	},
	models.RoutingStrategyGeoAffinity: {
		Name:                models.RoutingStrategyGeoAffinity,
		GeoPreferenceWeight: 0.5,
		ReliabilityWeight:   0.2,
		ReputationWeight:    0.1,
		CostWeight:          0.1,
		LatencyWeight:       0.1,
	},
	models.RoutingStrategyProfitOptimized: {
		Name:                models.RoutingStrategyProfitOptimized,
		CostWeight:          0.3,
		ReliabilityWeight:   0.2,
		ReputationWeight:    0.1,
		LatencyWeight:       0.1,
		GeoPreferenceWeight: 0.1,
	},
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
	defaultStrategy models.RoutingStrategy
}

func NewSelector(defaultStrategy models.RoutingStrategy) *Selector {
	return &Selector{defaultStrategy: defaultStrategy}
}

func (s *Selector) ScoreDevice(device models.Device, strategy models.RoutingStrategy, costPerSMS float64, recipientCountry string) ScoredDevice {
	strat, ok := Strategies[strategy]
	if !ok {
		strat = Strategies[models.RoutingStrategyHighestReliability]
	}

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

	totalScore := (device.ReliabilityScore * strat.ReliabilityWeight) +
		(device.ReputationScore * strat.ReputationWeight) +
		(normalizedCost * strat.CostWeight) +
		(normalizedLatency * strat.LatencyWeight) +
		(geoScore * strat.GeoPreferenceWeight)

	randomization := 1.0 + (rand.Float64()*0.1 - 0.05)
	totalScore *= randomization

	return ScoredDevice{
		Device:             device,
		TotalScore:         totalScore,
		ReliabilityContrib: device.ReliabilityScore * strat.ReliabilityWeight,
		ReputationContrib:  device.ReputationScore * strat.ReputationWeight,
		CostContrib:        normalizedCost * strat.CostWeight,
		LatencyContrib:     normalizedLatency * strat.LatencyWeight,
		GeoContrib:         geoScore * strat.GeoPreferenceWeight,
	}
}

func (s *Selector) SelectDevices(devices []models.Device, strategy models.RoutingStrategy, costMap map[string]float64, recipientCountry string, limit int) []ScoredDevice {
	scored := make([]ScoredDevice, 0, len(devices))
	for _, d := range devices {
		scored = append(scored, s.ScoreDevice(d, strategy, costMap[d.ID], recipientCountry))
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
	Strategy           models.RoutingStrategy
	RecipientCountry   string
	MaxResults         int
	ExcludeBlocked     bool
	ExcludeDegraded    bool
	RequireOnline      bool
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

	return s.SelectDevices(eligible, opts.Strategy, costMap, opts.RecipientCountry, opts.MaxResults)
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

func (s *Selector) DefaultStrategy() models.RoutingStrategy {
	return s.defaultStrategy
}
