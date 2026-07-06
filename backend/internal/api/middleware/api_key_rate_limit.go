package middleware

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// APIKeyRateLimiter applies per-API-key rate limiting using a fixed-window counter.
type APIKeyRateLimiter struct {
	rdb       *redis.Client
	maxPerMin int
}

func NewAPIKeyRateLimiter(rdb *redis.Client, maxPerMin int) *APIKeyRateLimiter {
	return &APIKeyRateLimiter{rdb: rdb, maxPerMin: maxPerMin}
}

// Limit wraps an http.Handler with per-API-key rate limiting.
// It reads the API key from the Authorization header (Bearer token) or
// the X-API-Key header, and rate limits based on that key.
func (l *APIKeyRateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		apiKey := extractAPIKey(r)
		if apiKey == "" {
			next.ServeHTTP(w, r)
			return
		}

		ctx := r.Context()
		key := fmt.Sprintf("rl:apikey:%s:%d", apiKey, time.Now().Unix()/60)

		count, err := l.rdb.Incr(ctx, key).Result()
		if err != nil {
			// Redis failure — allow the request through (fail open)
			next.ServeHTTP(w, r)
			return
		}

		// Set expiry on first request in this window
		if count == 1 {
			l.rdb.Expire(ctx, key, 2*time.Minute)
		}

		// Set rate limit headers
		w.Header().Set("X-RateLimit-Limit", strconv.Itoa(l.maxPerMin))
		remaining := l.maxPerMin - int(count)
		if remaining < 0 {
			remaining = 0
		}
		w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))

		if int(count) > l.maxPerMin {
			retryAfter := 60 - (time.Now().Unix() % 60)
			w.Header().Set("Retry-After", strconv.FormatInt(retryAfter, 10))
			writeError(w, http.StatusTooManyRequests, "rate limit exceeded, try again later")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// extractAPIKey extracts the API key from the request.
// API keys are opaque strings (no dots). JWTs are structured tokens with dots.
func extractAPIKey(r *http.Request) string {
	// Check X-API-Key header first (explicit API key)
	if key := r.Header.Get("X-API-Key"); key != "" {
		return key
	}

	// Check Authorization: Bearer <api-key>
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		token := strings.TrimPrefix(auth, "Bearer ")
		// API keys are opaque strings without dots; JWTs have 2 dots (header.payload.signature)
		if !strings.Contains(token, ".") {
			return token
		}
	}

	return ""
}

