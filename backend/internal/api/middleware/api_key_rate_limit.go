package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// APIKeyRateLimiter applies per-API-key rate limiting using Redis sliding window.
type APIKeyRateLimiter struct {
	rdb       *redis.Client
	maxPerMin int
}

type apiKeyRateLimitKey struct{}

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
		w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(max(0, l.maxPerMin-int(count))))

		if int(count) > l.maxPerMin {
			retryAfter := 60 - (time.Now().Unix() % 60)
			w.Header().Set("Retry-After", strconv.FormatInt(retryAfter, 10))
			http.Error(w, `{"error":"rate limit exceeded, try again later"}`, http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// extractAPIKey tries to get the API key from the request.
func extractAPIKey(r *http.Request) string {
	// Check X-API-Key header
	if key := r.Header.Get("X-API-Key"); key != "" {
		return key
	}

	// Check Authorization: Bearer <api-key>
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		token := strings.TrimPrefix(auth, "Bearer ")
		// Only use for rate limiting if it looks like an API key (not a JWT)
		if len(token) > 20 && !strings.Contains(token, ".") {
			return token
		}
	}

	return ""
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// ContextWithAPIKey stores the API key in context for downstream use.
func ContextWithAPIKey(ctx context.Context, key string) context.Context {
	return context.WithValue(ctx, apiKeyRateLimitKey{}, key)
}
