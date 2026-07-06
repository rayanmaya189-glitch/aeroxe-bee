package middleware

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// IPRateLimiter applies per-IP rate limiting using a fixed-window counter.
// Used to protect public endpoints from abuse (e.g. version-check, firebase-config).
type IPRateLimiter struct {
	rdb       *redis.Client
	maxPerMin int
}

func NewIPRateLimiter(rdb *redis.Client, maxPerMin int) *IPRateLimiter {
	return &IPRateLimiter{rdb: rdb, maxPerMin: maxPerMin}
}

// Limit wraps an http.Handler with per-IP rate limiting.
// It extracts the client IP from the X-Forwarded-For, X-Real-IP, or RemoteAddr header.
func (l *IPRateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := extractClientIP(r)
		if ip == "" {
			next.ServeHTTP(w, r)
			return
		}

		ctx := r.Context()
		key := fmt.Sprintf("rl:ip:%s:%d", ip, time.Now().Unix()/60)

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

// extractClientIP extracts the real client IP from proxy headers or RemoteAddr.
func extractClientIP(r *http.Request) string {
	// Check X-Forwarded-For first (set by load balancers / reverse proxies)
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// X-Forwarded-For may contain multiple IPs; the first is the original client
		for i := 0; i < len(xff); i++ {
			if xff[i] == ',' {
				return xff[:i]
			}
		}
		return xff
	}
	// Check X-Real-IP (set by nginx)
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}
	// Fall back to RemoteAddr (strip port)
	addr := r.RemoteAddr
	if idx := len(addr) - 1; idx >= 0 {
		for i := idx; i >= 0; i-- {
			if addr[i] == ':' {
				return addr[:i]
			}
		}
	}
	return addr
}
