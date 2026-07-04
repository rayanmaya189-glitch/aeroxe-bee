package middleware

import (
	"context"
	"net/http"
	"strconv"
)

type apiVersionKey struct{}

// APIVersionHeader reads the X-API-Version request header and stores it
// in the request context. This enables future API versioning without
// breaking existing clients.
// If no header is present, version defaults to 1.
func APIVersionHeader(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		version := 1
		if v := r.Header.Get("X-API-Version"); v != "" {
			if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
				version = parsed
			}
		}
		ctx := context.WithValue(r.Context(), apiVersionKey{}, version)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetAPIVersion extracts the API version from the request context.
// Returns 1 (default) if not set.
func GetAPIVersion(ctx context.Context) int {
	if v, ok := ctx.Value(apiVersionKey{}).(int); ok {
		return v
	}
	return 1
}
