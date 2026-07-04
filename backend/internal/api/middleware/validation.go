package middleware

import (
	"regexp"
	"strings"
	"unicode"
)

// PasswordStrength validates password meets OWASP minimum requirements:
// - At least 8 characters
// - At least one uppercase letter
// - At least one lowercase letter
// - At least one digit
// - At least one special character
// Returns error message if password is too weak.
func PasswordStrength(password string) string {
	if len(password) < 8 {
		return "password must be at least 8 characters"
	}
	if len(password) > 128 {
		return "password must be at most 128 characters"
	}

	var hasUpper, hasLower, hasDigit, hasSpecial bool
	for _, c := range password {
		switch {
		case unicode.IsUpper(c):
			hasUpper = true
		case unicode.IsLower(c):
			hasLower = true
		case unicode.IsDigit(c):
			hasDigit = true
		case unicode.IsPunct(c) || unicode.IsSymbol(c):
			hasSpecial = true
		}
	}

	if !hasUpper {
		return "password must contain at least one uppercase letter"
	}
	if !hasLower {
		return "password must contain at least one lowercase letter"
	}
	if !hasDigit {
		return "password must contain at least one digit"
	}
	if !hasSpecial {
		return "password must contain at least one special character (!@#$%^&*)"
	}

	// Check for common weak passwords
	lower := strings.ToLower(password)
	weakPasswords := []string{
		"password1!", "admin123!", "letmein1!", "welcome1!",
		"qwerty123!", "abc12345!", "password123!",
	}
	for _, weak := range weakPasswords {
		if lower == weak {
			return "password is too common, choose a more unique password"
		}
	}

	return ""
}

// IsValidEmail validates email format (basic RFC 5322 check)
func IsValidEmail(email string) bool {
	if len(email) > 254 {
		return false
	}
	// Simple but effective email regex
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

// IsValidUUID validates UUID v4 format
func IsValidUUID(id string) bool {
	if len(id) != 36 {
		return false
	}
	uuidRegex := regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)
	return uuidRegex.MatchString(strings.ToLower(id))
}

// IsValidPhone validates E.164 phone format (e.g. +1234567890)
func IsValidPhone(phone string) bool {
	if len(phone) < 7 || len(phone) > 16 {
		return false
	}
	if phone[0] != '+' {
		return false
	}
	for _, c := range phone[1:] {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

// SanitizeString trims whitespace and limits length to prevent abuse
func SanitizeString(s string, maxLen int) string {
	s = strings.TrimSpace(s)
	if len(s) > maxLen {
		s = s[:maxLen]
	}
	return s
}

// IsValidURL validates a basic URL format
func IsValidURL(url string) bool {
	if len(url) > 2048 {
		return false
	}
	// Must start with http:// or https://
	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		return false
	}
	// Must have a domain
	trimmed := strings.TrimPrefix(strings.TrimPrefix(url, "https://"), "http://")
	return len(trimmed) > 0 && strings.Contains(trimmed, ".")
}

// ValidateRole checks that the role is one of the allowed values
func ValidateRole(role string) bool {
	allowed := map[string]bool{
		"admin": true, "staff": true, "viewer": true,
	}
	return allowed[role]
}
