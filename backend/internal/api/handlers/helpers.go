package handlers

import "os"

// getEnvOrDefault returns the value of the environment variable named by the key,
// or the fallback value if the environment variable is empty or not set.
func getEnvOrDefault(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

// detectCountryFromPhone returns the country code and region for a given phone number.
// This is a shared utility used by both device registration and QR pairing handlers.
func detectCountryFromPhone(phone string) (string, string) {
	if len(phone) < 3 {
		return "", ""
	}
	if phone[0] == '+' {
		phone = phone[1:]
	}
	prefixes := map[string]string{
		"1":   "US", "44": "GB", "91": "IN", "86": "CN", "81": "JP",
		"82": "KR", "49": "DE", "33": "FR", "39": "IT", "34": "ES",
		"61": "AU", "55": "BR", "7": "RU", "52": "MX", "971": "AE",
		"855": "KH",
	}
	regionMap := map[string]string{
		"US": "NA", "GB": "EU", "IN": "APAC", "CN": "APAC", "JP": "APAC",
		"KR": "APAC", "DE": "EU", "FR": "EU", "IT": "EU", "ES": "EU",
		"AU": "APAC", "BR": "LATAM", "RU": "EU", "MX": "LATAM",
		"AE": "APAC", "KH": "APAC",
	}
	for prefix, country := range prefixes {
		if len(phone) >= len(prefix) && phone[:len(prefix)] == prefix {
			return country, regionMap[country]
		}
	}
	return "", ""
}
