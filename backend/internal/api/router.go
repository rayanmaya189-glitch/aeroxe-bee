package api

import (
	"net/http"

	"github.com/textbee/backend/internal/api/handlers"
	"github.com/textbee/backend/internal/api/middleware"
	"github.com/textbee/backend/internal/database"
	"github.com/textbee/backend/internal/telemetry"
)

func NewRouter(
	authHandler *handlers.AuthHandler,
	messageHandler *handlers.MessageHandler,
	deviceHandler *handlers.DeviceHandler,
	accountHandler *handlers.AccountHandler,
	adminHandler *handlers.AdminHandler,
	templateHandler *handlers.TemplateHandler,
	webhookHandler *handlers.WebhookHandler,
	otpHandler *handlers.OTPHandler,
	billingHandler *handlers.BillingHandler,
	fraudHandler *handlers.FraudHandler,
	authMiddleware *middleware.AuthMiddleware,
	metrics *telemetry.Metrics,
	pg *database.PostgresDB,
	rdb *database.RedisDB,
) http.Handler {
	mux := http.NewServeMux()

	healthHandler := handlers.NewHealthHandler(pg, rdb, metrics)

	mux.HandleFunc("GET /api/v1/health", healthHandler.Check)

	mux.HandleFunc("POST /api/v1/auth/register", authHandler.Register)
	mux.HandleFunc("POST /api/v1/auth/login", authHandler.Login)
	mux.Handle("POST /api/v1/auth/refresh", authMiddleware.JWTAuth(http.HandlerFunc(authHandler.RefreshToken)))
	mux.Handle("GET /api/v1/auth/profile", authMiddleware.JWTAuth(http.HandlerFunc(authHandler.GetProfile)))
	mux.Handle("POST /api/v1/auth/change-password", authMiddleware.JWTAuth(http.HandlerFunc(authHandler.ChangePassword)))

	mux.Handle("POST /api/v1/send", authMiddleware.APIKeyAuth(http.HandlerFunc(messageHandler.Send)))
	mux.Handle("GET /api/v1/messages", authMiddleware.APIKeyAuth(http.HandlerFunc(messageHandler.ListMessages)))
	mux.Handle("GET /api/v1/messages/{id}", authMiddleware.APIKeyAuth(http.HandlerFunc(messageHandler.GetMessage)))
	mux.Handle("GET /api/v1/messages/{id}/confidence", authMiddleware.APIKeyAuth(http.HandlerFunc(messageHandler.GetConfidence)))

	mux.Handle("POST /api/v1/otp/send", authMiddleware.APIKeyAuth(http.HandlerFunc(otpHandler.Send)))
	mux.Handle("POST /api/v1/otp/verify", authMiddleware.APIKeyAuth(http.HandlerFunc(otpHandler.Verify)))

	mux.Handle("POST /api/v1/devices", authMiddleware.JWTAuth(http.HandlerFunc(deviceHandler.Register)))
	mux.Handle("GET /api/v1/devices", authMiddleware.JWTAuth(http.HandlerFunc(deviceHandler.List)))
	mux.Handle("GET /api/v1/devices/{id}", authMiddleware.JWTAuth(http.HandlerFunc(deviceHandler.Get)))

	mux.Handle("GET /api/v1/account/profile", authMiddleware.JWTAuth(http.HandlerFunc(accountHandler.GetProfile)))
	mux.Handle("PUT /api/v1/account/profile", authMiddleware.JWTAuth(http.HandlerFunc(accountHandler.UpdateProfile)))
	mux.Handle("GET /api/v1/account/api-keys", authMiddleware.JWTAuth(http.HandlerFunc(accountHandler.ListAPIKeys)))
	mux.Handle("POST /api/v1/account/api-keys", authMiddleware.JWTAuth(http.HandlerFunc(accountHandler.CreateAPIKey)))
	mux.Handle("DELETE /api/v1/account/api-keys/{id}", authMiddleware.JWTAuth(http.HandlerFunc(accountHandler.RevokeAPIKey)))
	mux.Handle("PUT /api/v1/account/routing-strategy", authMiddleware.JWTAuth(http.HandlerFunc(accountHandler.UpdateRoutingStrategy)))
	mux.Handle("GET /api/v1/account/subscription", authMiddleware.JWTAuth(http.HandlerFunc(accountHandler.GetSubscription)))
	mux.Handle("GET /api/v1/account/usage", authMiddleware.JWTAuth(http.HandlerFunc(accountHandler.GetUsage)))

	mux.Handle("POST /api/v1/templates", authMiddleware.JWTAuth(http.HandlerFunc(templateHandler.Create)))
	mux.Handle("GET /api/v1/templates", authMiddleware.JWTAuth(http.HandlerFunc(templateHandler.List)))
	mux.Handle("GET /api/v1/templates/{id}", authMiddleware.JWTAuth(http.HandlerFunc(templateHandler.Get)))
	mux.Handle("PUT /api/v1/templates/{id}", authMiddleware.JWTAuth(http.HandlerFunc(templateHandler.Update)))
	mux.Handle("DELETE /api/v1/templates/{id}", authMiddleware.JWTAuth(http.HandlerFunc(templateHandler.Delete)))

	mux.Handle("GET /api/v1/webhooks", authMiddleware.JWTAuth(http.HandlerFunc(webhookHandler.List)))
	mux.Handle("POST /api/v1/webhooks", authMiddleware.JWTAuth(http.HandlerFunc(webhookHandler.Create)))
	mux.Handle("GET /api/v1/webhooks/{id}", authMiddleware.JWTAuth(http.HandlerFunc(webhookHandler.Get)))
	mux.Handle("PUT /api/v1/webhooks/{id}", authMiddleware.JWTAuth(http.HandlerFunc(webhookHandler.Update)))
	mux.Handle("DELETE /api/v1/webhooks/{id}", authMiddleware.JWTAuth(http.HandlerFunc(webhookHandler.Delete)))
	mux.Handle("POST /api/v1/webhooks/{id}/rotate-secret", authMiddleware.JWTAuth(http.HandlerFunc(webhookHandler.RotateSecret)))

	mux.Handle("GET /api/v1/plans", authMiddleware.JWTAuth(http.HandlerFunc(billingHandler.ListPlans)))
	mux.Handle("GET /api/v1/plans/{id}", authMiddleware.JWTAuth(http.HandlerFunc(billingHandler.GetPlan)))
	mux.Handle("GET /api/v1/billing/invoice", authMiddleware.JWTAuth(http.HandlerFunc(billingHandler.GetInvoice)))
	mux.Handle("GET /api/v1/billing/usage", authMiddleware.JWTAuth(http.HandlerFunc(billingHandler.GetUsage)))

	mux.Handle("GET /admin/stats", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.GetStats)))
	mux.Handle("GET /admin/accounts", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.ListAccounts)))
	mux.Handle("GET /admin/accounts/{id}", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.GetAccount)))
	mux.Handle("POST /admin/accounts/{id}/suspend", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.SuspendAccount)))
	mux.Handle("POST /admin/accounts/{id}/activate", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.ActivateAccount)))
	mux.Handle("GET /admin/analytics", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.GetAnalytics)))
	mux.Handle("GET /admin/circuit-breakers", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.GetCircuitBreakers)))
	mux.Handle("POST /admin/circuit-breakers/{scope}/{id}/reset", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.ResetCircuitBreaker)))
	mux.Handle("GET /admin/dead-letters", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.GetDeadLetters)))
	mux.Handle("POST /admin/dead-letters/{id}/retry", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.RetryDeadLetter)))
	mux.Handle("GET /admin/templates/pending", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.GetPendingTemplates)))
	mux.Handle("POST /admin/templates/{id}/approve", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.ApproveTemplate)))
	mux.Handle("POST /admin/templates/{id}/reject", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.RejectTemplate)))
	mux.Handle("GET /admin/fraud-flags", authMiddleware.AdminAuth(http.HandlerFunc(fraudHandler.ListFlags)))
	mux.Handle("POST /admin/fraud-flags/{id}/review", authMiddleware.AdminAuth(http.HandlerFunc(fraudHandler.ReviewFlag)))
	mux.Handle("GET /admin/abuse-flags", authMiddleware.AdminAuth(http.HandlerFunc(fraudHandler.ListAbuseFlags)))
	mux.Handle("POST /api/v1/fraud/check", authMiddleware.APIKeyAuth(http.HandlerFunc(fraudHandler.Check)))

	return mux
}
