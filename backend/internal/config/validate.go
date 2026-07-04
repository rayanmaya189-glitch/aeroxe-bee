package config

import (
	"errors"
	"fmt"
)

// defaultSecrets lists known insecure default values that must not be used in production.
var defaultSecrets = map[string]string{
	"change-me-in-production":                          "JWT_SECRET",
	"change-encryption-key-in-production":              "ENCRYPTION_MASTER_KEY",
	"change-encryption-key-in-production-32bytes!":     "ENCRYPTION_MASTER_KEY",
}

// ValidateProduction checks that critical secrets have been changed from defaults
// when running in a production environment. Returns an error if any insecure defaults are detected.
func ValidateProduction(cfg *Config) error {
	if cfg.App.Environment != "production" && cfg.App.Environment != "staging" {
		return nil
	}

	var errs []string

	if defaultVar, ok := defaultSecrets[cfg.JWT.Secret]; ok {
		errs = append(errs, fmt.Sprintf("%s is using default value '%s' — set a secure value via env var", defaultVar, cfg.JWT.Secret))
	}

	if cfg.Encryption.MasterKey == "" {
		errs = append(errs, "ENCRYPTION_MASTER_KEY is not set — MQTT credential encryption will be disabled")
	} else if defaultVar, ok := defaultSecrets[cfg.Encryption.MasterKey]; ok {
		errs = append(errs, fmt.Sprintf("%s is using default value — set a secure 32-byte key via env var", defaultVar))
	}

	if len(errs) > 0 {
		msg := "SECURITY: production/staging environment detected with insecure defaults:\n"
		for _, e := range errs {
			msg += "  - " + e + "\n"
		}
		return errors.New(msg)
	}

	return nil
}
