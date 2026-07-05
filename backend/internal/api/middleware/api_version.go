package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
)

const (
	// CurrentAPIVersion is the latest supported API version.
	CurrentAPIVersion = 1
	// MinAPIVersion is the oldest supported API version.
	MinAPIVersion = 1
)

type apiVersionKey struct{}

// APIVersionHeader reads the X-API-Version request header, validates it,
// and stores it in the request context. If the version is unsupported,
// it returns 400 Bad Request.
// If no header is present, version defaults to 1.
func APIVersionHeader(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		version := 1
		if v := r.Header.Get("X-API-Version"); v != "" {
			parsed, err := strconv.Atoi(v)
			if err != nil || parsed < 1 {
				writeVersionError(w, "invalid X-API-Version header: must be a positive integer")
				return
			}
			if parsed < MinAPIVersion || parsed > CurrentAPIVersion {
				w.Header().Set("X-API-Min-Version", strconv.Itoa(MinAPIVersion))
				w.Header().Set("X-API-Max-Version", strconv.Itoa(CurrentAPIVersion))
				writeVersionError(w, "unsupported API version "+v+
					": supported range is "+strconv.Itoa(MinAPIVersion)+
						" to "+strconv.Itoa(CurrentAPIVersion))
				return
			}
			version = parsed
		}
		ctx := context.WithValue(r.Context(), apiVersionKey{}, version)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// writeVersionError sends a 400 response with version info headers.
func writeVersionError(w http.ResponseWriter, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-API-Min-Version", strconv.Itoa(MinAPIVersion))
	w.Header().Set("X-API-Max-Version", strconv.Itoa(CurrentAPIVersion))
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error": msg,
		"min_version": MinAPIVersion,
		"max_version": CurrentAPIVersion,
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
