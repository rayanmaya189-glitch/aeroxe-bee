package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/aeroxe-bee/backend/internal/models"
	"github.com/aeroxe-bee/backend/internal/services"
)

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

type contextKey string

const (
	ContextAccountID  contextKey = "account_id"
	ContextIsAdmin     contextKey = "is_admin"
	ContextAPIKeyID   contextKey = "api_key_id"
	ContextAccount    contextKey = "account"
	ContextAPIKey     contextKey = "api_key"
)

type AuthMiddleware struct {
	apiKeyService *services.APIKeyService
	accountService *services.AccountService
	jwtSecret     string
}

func NewAuthMiddleware(apiKeyService *services.APIKeyService, accountService *services.AccountService, jwtSecret string) *AuthMiddleware {
	return &AuthMiddleware{
		apiKeyService:  apiKeyService,
		accountService: accountService,
		jwtSecret:     jwtSecret,
	}
}

func (m *AuthMiddleware) APIKeyAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"error":"missing authorization header"}`, http.StatusUnauthorized)
			return
		}

		apiKey := strings.TrimPrefix(authHeader, "Bearer ")
		if apiKey == authHeader {
			http.Error(w, `{"error":"invalid authorization format"}`, http.StatusUnauthorized)
			return
		}

		keyObj, err := m.apiKeyService.Validate(r.Context(), apiKey)
		if err != nil || keyObj == nil {
			http.Error(w, `{"error":"invalid or revoked API key"}`, http.StatusUnauthorized)
			return
		}

		// Track API key usage (fire-and-forget)
		go m.apiKeyService.RecordUsage(r.Context(), keyObj.ID)

		ctx := context.WithValue(r.Context(), ContextAccountID, keyObj.AccountID)
		ctx = context.WithValue(ctx, ContextAPIKeyID, keyObj.ID)
		ctx = context.WithValue(ctx, ContextAPIKey, keyObj)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (m *AuthMiddleware) AdminAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Support both JWT Bearer token and cookie-based auth
		var tokenString string

		// Try Authorization header first (JWT Bearer)
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}

		// Fall back to cookie
		if tokenString == "" {
			cookie, err := r.Cookie("session_token")
			if err == nil {
				tokenString = cookie.Value
			}
		}

		if tokenString == "" {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return []byte(m.jwtSecret), nil
		})
		if err != nil || !token.Valid {
			http.Error(w, `{"error":"invalid session"}`, http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, `{"error":"invalid token claims"}`, http.StatusUnauthorized)
			return
		}

		accountID, ok := claims["sub"].(string)
		if !ok {
			http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), ContextAccountID, accountID)
		ctx = context.WithValue(ctx, ContextIsAdmin, claims["admin"] == true)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (m *AuthMiddleware) JWTAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"error":"missing authorization header"}`, http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			http.Error(w, `{"error":"invalid authorization format"}`, http.StatusUnauthorized)
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return []byte(m.jwtSecret), nil
		})
		if err != nil || !token.Valid {
			http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, `{"error":"invalid token claims"}`, http.StatusUnauthorized)
			return
		}

		accountID, ok := claims["sub"].(string)
		if !ok {
			http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), ContextAccountID, accountID)
		ctx = context.WithValue(ctx, ContextIsAdmin, claims["admin"] == true)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (m *AuthMiddleware) GenerateToken(accountID, email string, admin bool, ttl time.Duration) (string, error) {
	return m.GenerateTokenWithPurpose(accountID, email, admin, ttl, "")
}

func (m *AuthMiddleware) GenerateTokenWithPurpose(accountID, email string, admin bool, ttl time.Duration, purpose string) (string, error) {
	claims := jwt.MapClaims{
		"sub":   accountID,
		"email": email,
		"admin": admin,
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(ttl).Unix(),
		"iss":   "aeroxebee",
	}
	if purpose != "" {
		claims["purpose"] = purpose
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(m.jwtSecret))
}

func GetAccountID(ctx context.Context) string {
	if id, ok := ctx.Value(ContextAccountID).(string); ok {
		return id
	}
	return ""
}

func GetIsAdmin(ctx context.Context) bool {
	if admin, ok := ctx.Value(ContextIsAdmin).(bool); ok {
		return admin
	}
	return false
}

func GetAPIKeyID(ctx context.Context) string {
	if id, ok := ctx.Value(ContextAPIKeyID).(string); ok {
		return id
	}
	return ""
}

func GetAPIKey(ctx context.Context) *models.APIKey {
	if key, ok := ctx.Value(ContextAPIKey).(*models.APIKey); ok {
		return key
	}
	return nil
}

// ParseToken parses and validates a JWT token string, returning claims as a map
func (m *AuthMiddleware) ParseToken(tokenString string) (map[string]interface{}, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(m.jwtSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	result := make(map[string]interface{})
	for k, v := range claims {
		result[k] = v
	}
	return result, nil
}

func decodeJSON(r *http.Request, v interface{}) error {
	return json.NewDecoder(r.Body).Decode(v)
}


