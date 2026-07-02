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
	userHandler *handlers.UserHandler,
	templateHandler *handlers.TemplateHandler,
	webhookHandler *handlers.WebhookHandler,
	otpHandler *handlers.OTPHandler,
	billingHandler *handlers.BillingHandler,
	fraudHandler *handlers.FraudHandler,
	memberHandler *handlers.MemberHandler,
	authMiddleware *middleware.AuthMiddleware,
	metrics *telemetry.Metrics,
	pg *database.PostgresDB,
	rdb *database.RedisDB,
) http.Handler {
	mux := http.NewServeMux()

	healthHandler := handlers.NewHealthHandler(pg, rdb, metrics)

	mux.HandleFunc("GET /api/v1/health", healthHandler.Check)

	// Auth routes
	mux.HandleFunc("POST /api/v1/auth/register", authHandler.Register)
	mux.HandleFunc("POST /api/v1/auth/login", authHandler.Login)
	mux.HandleFunc("POST /api/v1/auth/refresh", authHandler.RefreshToken)
	mux.Handle("GET /api/v1/auth/profile", authMiddleware.JWTAuth(http.HandlerFunc(authHandler.GetProfile)))
	mux.Handle("PUT /api/v1/auth/profile", authMiddleware.JWTAuth(http.HandlerFunc(authHandler.UpdateProfile)))
	mux.Handle("POST /api/v1/auth/change-password", authMiddleware.JWTAuth(http.HandlerFunc(authHandler.ChangePassword)))

	// Message routes
	mux.Handle("POST /api/v1/send", authMiddleware.APIKeyAuth(http.HandlerFunc(messageHandler.Send)))
	mux.Handle("GET /api/v1/messages", authMiddleware.APIKeyAuth(http.HandlerFunc(messageHandler.ListMessages)))
	mux.Handle("GET /api/v1/messages/{id}", authMiddleware.APIKeyAuth(http.HandlerFunc(messageHandler.GetMessage)))
	mux.Handle("GET /api/v1/messages/{id}/confidence", authMiddleware.APIKeyAuth(http.HandlerFunc(messageHandler.GetConfidence)))

	// OTP routes
	mux.Handle("POST /api/v1/otp/send", authMiddleware.APIKeyAuth(http.HandlerFunc(otpHandler.Send)))
	mux.Handle("POST /api/v1/otp/verify", authMiddleware.APIKeyAuth(http.HandlerFunc(otpHandler.Verify)))

	// Device routes
	mux.HandleFunc("POST /api/v1/devices/login", deviceHandler.DeviceLogin)
	mux.HandleFunc("POST /api/v1/devices/register", deviceHandler.Register)
	mux.Handle("POST /api/v1/devices/status", authMiddleware.JWTAuth(http.HandlerFunc(deviceHandler.HandleStatusUpdate)))
	mux.Handle("POST /api/v1/devices/deregister", authMiddleware.JWTAuth(http.HandlerFunc(deviceHandler.Deregister)))
	mux.Handle("POST /api/v1/devices", authMiddleware.JWTAuth(http.HandlerFunc(deviceHandler.RegisterDeprecated)))
	mux.Handle("GET /api/v1/devices", authMiddleware.JWTAuth(http.HandlerFunc(deviceHandler.List)))
	mux.Handle("GET /api/v1/devices/{id}", authMiddleware.JWTAuth(http.HandlerFunc(deviceHandler.Get)))

	// Account routes
	mux.Handle("GET /api/v1/account/profile", authMiddleware.JWTAuth(http.HandlerFunc(accountHandler.GetProfile)))
	mux.Handle("PUT /api/v1/account/profile", authMiddleware.JWTAuth(http.HandlerFunc(accountHandler.UpdateProfile)))
	mux.Handle("GET /api/v1/account/api-keys", authMiddleware.JWTAuth(http.HandlerFunc(accountHandler.ListAPIKeys)))
	mux.Handle("POST /api/v1/account/api-keys", authMiddleware.JWTAuth(http.HandlerFunc(accountHandler.CreateAPIKey)))
	mux.Handle("DELETE /api/v1/account/api-keys/{id}", authMiddleware.JWTAuth(http.HandlerFunc(accountHandler.RevokeAPIKey)))
	mux.Handle("PUT /api/v1/account/routing-strategy", authMiddleware.JWTAuth(http.HandlerFunc(accountHandler.UpdateRoutingStrategy)))
	mux.Handle("GET /api/v1/account/subscription", authMiddleware.JWTAuth(http.HandlerFunc(accountHandler.GetSubscription)))
	mux.Handle("GET /api/v1/account/usage", authMiddleware.JWTAuth(http.HandlerFunc(accountHandler.GetUsage)))

	// Template routes (admin only)
	mux.Handle("POST /api/v1/templates", authMiddleware.AdminAuth(http.HandlerFunc(templateHandler.Create)))
	mux.Handle("GET /api/v1/templates", authMiddleware.AdminAuth(http.HandlerFunc(templateHandler.List)))
	mux.Handle("GET /api/v1/templates/{id}", authMiddleware.AdminAuth(http.HandlerFunc(templateHandler.Get)))
	mux.Handle("PUT /api/v1/templates/{id}", authMiddleware.AdminAuth(http.HandlerFunc(templateHandler.Update)))
	mux.Handle("DELETE /api/v1/templates/{id}", authMiddleware.AdminAuth(http.HandlerFunc(templateHandler.Delete)))

	// Webhook routes (admin only)
	mux.Handle("GET /api/v1/webhooks", authMiddleware.AdminAuth(http.HandlerFunc(webhookHandler.List)))
	mux.Handle("POST /api/v1/webhooks", authMiddleware.AdminAuth(http.HandlerFunc(webhookHandler.Create)))
	mux.Handle("GET /api/v1/webhooks/{id}", authMiddleware.AdminAuth(http.HandlerFunc(webhookHandler.Get)))
	mux.Handle("PUT /api/v1/webhooks/{id}", authMiddleware.AdminAuth(http.HandlerFunc(webhookHandler.Update)))
	mux.Handle("DELETE /api/v1/webhooks/{id}", authMiddleware.AdminAuth(http.HandlerFunc(webhookHandler.Delete)))
	mux.Handle("POST /api/v1/webhooks/{id}/rotate-secret", authMiddleware.AdminAuth(http.HandlerFunc(webhookHandler.RotateSecret)))

	// Billing routes
	mux.Handle("GET /api/v1/plans", authMiddleware.JWTAuth(http.HandlerFunc(billingHandler.ListPlans)))
	mux.Handle("GET /api/v1/plans/{id}", authMiddleware.JWTAuth(http.HandlerFunc(billingHandler.GetPlan)))
	mux.Handle("GET /api/v1/billing/invoice", authMiddleware.JWTAuth(http.HandlerFunc(billingHandler.GetInvoice)))
	mux.Handle("GET /api/v1/billing/usage", authMiddleware.JWTAuth(http.HandlerFunc(billingHandler.GetUsage)))

	// Fraud check (API key auth)
	mux.Handle("POST /api/v1/fraud/check", authMiddleware.APIKeyAuth(http.HandlerFunc(fraudHandler.Check)))

	// Member portal routes (account/member auth)
	mux.Handle("GET /api/v1/member/dashboard", authMiddleware.JWTAuth(http.HandlerFunc(memberHandler.GetDashboard)))
	mux.Handle("GET /api/v1/member/devices", authMiddleware.JWTAuth(http.HandlerFunc(memberHandler.GetDevices)))
	mux.Handle("PUT /api/v1/member/devices/{id}", authMiddleware.JWTAuth(http.HandlerFunc(memberHandler.UpdateDevice)))
	mux.Handle("DELETE /api/v1/member/devices/{id}", authMiddleware.JWTAuth(http.HandlerFunc(memberHandler.DeleteDevice)))
	mux.Handle("GET /api/v1/member/messages", authMiddleware.JWTAuth(http.HandlerFunc(memberHandler.GetMessages)))
	mux.Handle("GET /api/v1/member/analytics", authMiddleware.JWTAuth(http.HandlerFunc(memberHandler.GetAnalytics)))
	mux.Handle("GET /api/v1/member/stats", authMiddleware.JWTAuth(http.HandlerFunc(memberHandler.GetStats)))

	// Member template routes (scoped to the member's account)
	mux.Handle("GET /api/v1/member/templates", authMiddleware.JWTAuth(http.HandlerFunc(memberHandler.ListTemplates)))
	mux.Handle("POST /api/v1/member/templates", authMiddleware.JWTAuth(http.HandlerFunc(memberHandler.CreateTemplate)))
	mux.Handle("GET /api/v1/member/templates/{id}", authMiddleware.JWTAuth(http.HandlerFunc(memberHandler.GetTemplate)))
	mux.Handle("PUT /api/v1/member/templates/{id}", authMiddleware.JWTAuth(http.HandlerFunc(memberHandler.UpdateTemplate)))
	mux.Handle("DELETE /api/v1/member/templates/{id}", authMiddleware.JWTAuth(http.HandlerFunc(memberHandler.DeleteTemplate)))

	// Member webhook routes (scoped to the member's account)
	mux.Handle("GET /api/v1/member/webhooks", authMiddleware.JWTAuth(http.HandlerFunc(memberHandler.ListWebhooks)))
	mux.Handle("POST /api/v1/member/webhooks", authMiddleware.JWTAuth(http.HandlerFunc(memberHandler.CreateWebhook)))
	mux.Handle("GET /api/v1/member/webhooks/{id}", authMiddleware.JWTAuth(http.HandlerFunc(memberHandler.GetWebhook)))
	mux.Handle("PUT /api/v1/member/webhooks/{id}", authMiddleware.JWTAuth(http.HandlerFunc(memberHandler.UpdateWebhook)))
	mux.Handle("DELETE /api/v1/member/webhooks/{id}", authMiddleware.JWTAuth(http.HandlerFunc(memberHandler.DeleteWebhook)))
	mux.Handle("POST /api/v1/member/webhooks/{id}/rotate-secret", authMiddleware.JWTAuth(http.HandlerFunc(memberHandler.RotateWebhookSecret)))

	// Admin routes
	mux.Handle("GET /api/v1/admin/stats", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.GetStats)))
	mux.Handle("GET /api/v1/admin/accounts", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.ListAccounts)))
	mux.Handle("GET /api/v1/admin/accounts/{id}", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.GetAccount)))
	mux.Handle("DELETE /api/v1/admin/accounts/{id}", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.DeleteAccount)))
	mux.Handle("POST /api/v1/admin/accounts/{id}/suspend", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.SuspendAccount)))
	mux.Handle("POST /api/v1/admin/accounts/{id}/activate", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.ActivateAccount)))
	mux.Handle("GET /api/v1/admin/analytics", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.GetAnalytics)))
	mux.Handle("GET /api/v1/admin/charts/daily", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.GetDailyCharts)))
	mux.Handle("GET /api/v1/admin/activity", authMiddleware.AdminAuth(http.HandlerFunc(userHandler.GetActivityLog)))
	mux.Handle("GET /api/v1/admin/circuit-breakers", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.GetCircuitBreakers)))
	mux.Handle("POST /api/v1/admin/circuit-breakers/{scope}/{id}/reset", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.ResetCircuitBreaker)))
	mux.Handle("GET /api/v1/admin/dead-letters", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.GetDeadLetters)))
	mux.Handle("POST /api/v1/admin/dead-letters/{id}/retry", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.RetryDeadLetter)))
	mux.Handle("GET /api/v1/admin/templates/pending", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.GetPendingTemplates)))
	mux.Handle("POST /api/v1/admin/templates/{id}/approve", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.ApproveTemplate)))
	mux.Handle("POST /api/v1/admin/templates/{id}/reject", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.RejectTemplate)))
	mux.Handle("GET /api/v1/admin/fraud-flags", authMiddleware.AdminAuth(http.HandlerFunc(fraudHandler.ListFlags)))
	mux.Handle("POST /api/v1/admin/fraud-flags/{id}/review", authMiddleware.AdminAuth(http.HandlerFunc(fraudHandler.ReviewFlag)))
	mux.Handle("GET /api/v1/admin/abuse-flags", authMiddleware.AdminAuth(http.HandlerFunc(fraudHandler.ListAbuseFlags)))

	// Admin user management routes
	mux.Handle("GET /api/v1/admin/users", authMiddleware.AdminAuth(http.HandlerFunc(userHandler.List)))
	mux.Handle("GET /api/v1/admin/users/{id}", authMiddleware.AdminAuth(http.HandlerFunc(userHandler.Get)))
	mux.Handle("POST /api/v1/admin/users", authMiddleware.AdminAuth(http.HandlerFunc(userHandler.Create)))
	mux.Handle("PUT /api/v1/admin/users/{id}", authMiddleware.AdminAuth(http.HandlerFunc(userHandler.Update)))
	mux.Handle("DELETE /api/v1/admin/users/{id}", authMiddleware.AdminAuth(http.HandlerFunc(userHandler.Delete)))
	mux.Handle("POST /api/v1/admin/users/bulk-delete", authMiddleware.AdminAuth(http.HandlerFunc(userHandler.BulkDelete)))
	mux.Handle("POST /api/v1/admin/users/bulk-update", authMiddleware.AdminAuth(http.HandlerFunc(userHandler.BulkUpdate)))

	return mux
}
