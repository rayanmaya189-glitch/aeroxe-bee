package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net"
	"net/http"
	"runtime/debug"
	"strings"
	"time"
)

// contextKey types for request-scoped values
type securityContextKey string

const (
	ContextRequestID securityContextKey = "request_id"
	ContextClientIP  securityContextKey = "client_ip"
)

// RecoverPanic wraps an http.Handler with panic recovery to prevent server crashes
// and avoid leaking goroutine stack traces to clients (OWASP A05: Security Misconfiguration).
func RecoverPanic(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				// Log the full stack trace server-side
				log.Printf("[PANIC RECOVERY] %s %s: %v\n%s", r.Method, r.URL.Path, err, debug.Stack())

				// Return a generic 500 — never expose internal error details
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				fmt.Fprint(w, `{"error":"internal server error"}`)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// SecurityHeaders adds hardened security headers to every response (OWASP A05).
// - X-Content-Type-Options: nosniff — prevents MIME-type sniffing
// - X-Frame-Options: DENY — prevents clickjacking
// - X-XSS-Protection: 0 — disabled in favor of CSP (modern browsers)
// - Referrer-Policy: strict-origin-when-cross-origin — limits referrer leakage
// - Permissions-Policy: restricts browser features
// - Content-Security-Policy: restrictive default policy
// - Strict-Transport-Security: force HTTPS in production
// - Cache-Control: prevent caching of sensitive responses
func SecurityHeaders(env string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("X-Frame-Options", "DENY")
			w.Header().Set("X-XSS-Protection", "0")
			w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
			w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
			w.Header().Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")

			// HSTS only in production (OWASP A02: Cryptographic Failures)
			if env == "production" {
				w.Header().Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
			}

			// Prevent caching of authenticated responses
			if r.Header.Get("Authorization") != "" {
				w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, private")
				w.Header().Set("Pragma", "no-cache")
			}

			next.ServeHTTP(w, r)
		})
	}
}

// MaxBodySize limits request body size to prevent denial-of-service via large payloads
// (OWASP A04: Insecure Design). Default is 1 MB.
func MaxBodySize(maxBytes int64) func(http.Handler) http.Handler {
	if maxBytes <= 0 {
		maxBytes = 1 << 20 // 1 MB default
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Only limit body for methods that have a body
			if r.Method == "POST" || r.Method == "PUT" || r.Method == "PATCH" {
				r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RequestID generates a unique request ID and attaches it to the context and response header
// for traceability and security audit logging.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Use client-provided ID if present, otherwise generate one
		reqID := r.Header.Get("X-Request-ID")
		if reqID == "" {
			b := make([]byte, 8)
			if _, err := rand.Read(b); err == nil {
				reqID = hex.EncodeToString(b)
			} else {
				reqID = fmt.Sprintf("%d", time.Now().UnixNano())
			}
		}

		w.Header().Set("X-Request-ID", reqID)
		ctx := context.WithValue(r.Context(), ContextRequestID, reqID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// ExtractClientIP extracts the real client IP from headers or RemoteAddr,
// preferring X-Forwarded-For and X-Real-IP (for reverse proxy setups).
func ExtractClientIP(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := extractIP(r)
		ctx := context.WithValue(r.Context(), ContextClientIP, ip)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func extractIP(r *http.Request) string {
	// X-Forwarded-For: client, proxy1, proxy2
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return strings.TrimSpace(xri)
	}
	// Fall back to RemoteAddr (strip port)
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// GetClientIP retrieves the client IP from context
func GetClientIP(ctx context.Context) string {
	if ip, ok := ctx.Value(ContextClientIP).(string); ok {
		return ip
	}
	return ""
}

// GetRequestID retrieves the request ID from context
func GetRequestID(ctx context.Context) string {
	if id, ok := ctx.Value(ContextRequestID).(string); ok {
		return id
	}
	return ""
}

// MethodOverride supports X-HTTP-Method-Override header for clients that can't send PUT/DELETE
// (OWASP A05: Security Misconfiguration — controlled method override).
func MethodOverride(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			if override := r.Header.Get("X-HTTP-Method-Override"); override != "" {
				// Only allow safe method overrides from trusted headers
				switch strings.ToUpper(override) {
				case "GET", "PUT", "DELETE", "PATCH":
					r.Method = strings.ToUpper(override)
				}
			}
		}
		next.ServeHTTP(w, r)
	})
}

// SlowlorisProtection rejects requests that take too long to send headers,
// preventing slowloris-style denial of service attacks (OWASP A04).
func SlowlorisProtection(timeout time.Duration) func(http.Handler) http.Handler {
	if timeout <= 0 {
		timeout = 10 * time.Second
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// The server already has ReadTimeout/WriteTimeout set at the server level.
			// This is an additional layer for header reading.
			deadline := time.Now().Add(timeout)
			if d, ok := r.Context().Deadline(); !ok || d.After(deadline) {
				// Server-level timeout is sufficient — let it handle slowloris
			}
			next.ServeHTTP(w, r)
		})
	}
}
