package middleware

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// JWTRateLimiter applies per-account rate limiting using a fixed-window counter.
// Used to protect member and admin endpoints from abuse.
type JWTRateLimiter struct {
	rdb       *redis.Client
	maxPerMin int
}

func NewJWTRateLimiter(rdb *redis.Client, maxPerMin int) *JWTRateLimiter {
	return &JWTRateLimiter{rdb: rdb, maxPerMin: maxPerMin}
}

// Limit wraps an http.Handler with per-account rate limiting.
// It reads the account ID from the request context (set by JWTAuth middleware).
func (l *JWTRateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		accountID := GetAccountID(r.Context())
		if accountID == "" {
			// No account context — let it through (shouldn't happen behind JWTAuth)
			next.ServeHTTP(w, r)
			return
		}

		ctx := r.Context()
		key := fmt.Sprintf("rl:jwt:%s:%d", accountID, time.Now().Unix()/60)

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
