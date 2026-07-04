package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"
)

// BruteForceProtector provides rate limiting for authentication endpoints
// to prevent credential stuffing and brute force attacks (OWASP A07).
type BruteForceProtector struct {
	client       *redis.Client
	maxAttempts  int
	windowDuration time.Duration
	lockoutDuration time.Duration
}

func NewBruteForceProtector(client *redis.Client, maxAttempts int, windowDuration, lockoutDuration time.Duration) *BruteForceProtector {
	return &BruteForceProtector{
		client:          client,
		maxAttempts:     maxAttempts,
		windowDuration:  windowDuration,
		lockoutDuration: lockoutDuration,
	}
}

// Protect returns middleware that rate-limits requests by client IP + identifier
func (p *BruteForceProtector) Protect(identifier string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			ip := GetClientIP(ctx)
			if ip == "" {
				ip = r.RemoteAddr
			}

			key := fmt.Sprintf("bruteforce:%s:%s", identifier, ip)

			// Check if currently locked out
			lockoutKey := fmt.Sprintf("lockout:%s:%s", identifier, ip)
			locked, err := p.client.Exists(ctx, lockoutKey).Result()
			if err == nil && locked > 0 {
				ttl, _ := p.client.TTL(ctx, lockoutKey).Result()
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Retry-After", fmt.Sprintf("%.0f", ttl.Seconds()))
				w.WriteHeader(http.StatusTooManyRequests)
				fmt.Fprintf(w, `{"error":"too many attempts, try again in %d seconds"}`, int(ttl.Seconds()))
				return
			}

			// Increment attempt counter
			count, err := p.client.Incr(ctx, key).Result()
			if err != nil {
				// On Redis failure, allow the request through (fail open)
				next.ServeHTTP(w, r)
				return
			}

			// Set expiry on first attempt
			if count == 1 {
				p.client.Expire(ctx, key, p.windowDuration)
			}

			// Set rate limit headers
			remaining := p.maxAttempts - int(count)
			if remaining < 0 {
				remaining = 0
			}
			w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", p.maxAttempts))
			w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))

			if int(count) > p.maxAttempts {
				// Lock out the IP
				p.client.Set(ctx, lockoutKey, "1", p.lockoutDuration)
				p.client.Del(ctx, key)

				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Retry-After", fmt.Sprintf("%.0f", p.lockoutDuration.Seconds()))
				w.WriteHeader(http.StatusTooManyRequests)
				fmt.Fprintf(w, `{"error":"too many attempts, account locked for %d seconds"}`, int(p.lockoutDuration.Seconds()))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// Reset clears the attempt counter for a given identifier (call on successful auth)
func (p *BruteForceProtector) Reset(ctx context.Context, identifier, ip string) {
	key := fmt.Sprintf("bruteforce:%s:%s", identifier, ip)
	p.client.Del(ctx, key)
}
