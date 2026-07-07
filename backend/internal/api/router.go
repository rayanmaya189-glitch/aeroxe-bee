package api

import (
	"embed"
	"net/http"
	"strings"
	"time"

	"github.com/aeroxe-bee/backend/internal/api/handlers"
	"github.com/aeroxe-bee/backend/internal/api/middleware"
	"github.com/aeroxe-bee/backend/internal/config"
	"github.com/aeroxe-bee/backend/internal/database"
	"github.com/aeroxe-bee/backend/internal/mqtt"
	"github.com/aeroxe-bee/backend/internal/services"
	"github.com/aeroxe-bee/backend/internal/telemetry"
)

//go:embed docs/swagger.json
//go:embed docs/swagger-ui/*
var swaggerSpec embed.FS

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
	twoFAHandler *handlers.TwoFAHandler,
	paymentConfigHandler *handlers.PaymentConfigHandler,
	paymentRequestHandler *handlers.PaymentRequestHandler,
	subscriptionRequestHandler *handlers.SubscriptionRequestHandler,
	planChangeRequestHandler *handlers.PlanChangeRequestHandler,
	sessionHandler *handlers.SessionHandler,
	aiHandler *handlers.AIHandler,
	kycAdminHandler *handlers.KycAdminHandler,
	qrPairingHandler *handlers.QRPairingHandler,
	releaseHandler *handlers.AppReleaseHandler,
	firebaseConfigHandler *handlers.FirebaseConfigHandler,
	billingService *services.BillingService,
	paymentConfigService *services.PaymentConfigService,
	authMiddleware *middleware.AuthMiddleware,
	planMiddleware *middleware.PlanMiddleware,
	metrics *telemetry.Metrics,
	pg *database.PostgresDB,
	rdb *database.RedisDB,
	mqttClient *mqtt.Client,
	cfg *config.Config,
	sseHandler *handlers.SSEHandler,
) http.Handler {
	mux := http.NewServeMux()

	healthHandler := handlers.NewHealthHandler(pg, rdb, metrics)

	mux.HandleFunc("GET /api/v1/health", healthHandler.Check)

	// MQTT health endpoint — reports broker connection status
	mqttHealthHandler := handlers.NewMQTTHealthHandler(mqttClient)
	mux.HandleFunc("GET /api/v1/health/mqtt", mqttHealthHandler.Check)

	// Swagger / OpenAPI documentation
	mux.HandleFunc("GET /api/v1/docs", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		data, _ := swaggerSpec.ReadFile("docs/swagger.json")
		w.Write(data)
	})
	mux.HandleFunc("GET /api/v1/docs/ui", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>AeroXe Bee API Docs</title>
  <link rel="stylesheet" href="/api/v1/docs/ui/swagger-ui.css"/>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/api/v1/docs/ui/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/v1/docs',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
    });
  </script>
</body>
</html>`))
	})
	// Serve vendored swagger-ui static assets
	mux.HandleFunc("GET /api/v1/docs/ui/{file}", func(w http.ResponseWriter, r *http.Request) {
		file := r.PathValue("file")
		if file == "" {
			http.NotFound(w, r)
			return
		}
		data, err := swaggerSpec.ReadFile("docs/swagger-ui/" + file)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		switch {
		case strings.HasSuffix(file, ".css"):
			w.Header().Set("Content-Type", "text/css")
		case strings.HasSuffix(file, ".js"):
			w.Header().Set("Content-Type", "application/javascript")
		case strings.HasSuffix(file, ".png"):
			w.Header().Set("Content-Type", "image/png")
		}
		w.Header().Set("Cache-Control", "public, max-age=86400")
		w.Write(data)
	})

	// Public routes (no auth required)
	publicBillingHandler := handlers.NewPublicBillingHandler(billingService, paymentConfigService)
	contactSalesHandler := handlers.NewContactSalesHandler(pg.Pool)
	mux.HandleFunc("GET /api/v1/public/plans", publicBillingHandler.ListPublicPlans)
	mux.HandleFunc("GET /api/v1/public/payment-methods", publicBillingHandler.ListPublicPaymentMethods)
	mux.HandleFunc("POST /api/v1/public/contact-sales", contactSalesHandler.Submit)

	// Brute force protection for auth endpoints (OWASP A07)
	bfProtector := middleware.NewBruteForceProtector(
		rdb.Client,
		5,              // max 5 attempts
		15*time.Minute, // per 15-minute window
		30*time.Minute, // 30-minute lockout
	)

	// Per-API-key rate limiting for message send endpoint (configurable via env)
	apiKeyRateLimiter := middleware.NewAPIKeyRateLimiter(rdb.Client, cfg.RateLimit.APIKeyMaxPerMinute)

	// API version header middleware (validates X-API-Version header)
	versionMiddleware := middleware.APIVersionHeader

	// Per-account rate limiting for member endpoints
	memberRateLimiter := middleware.NewJWTRateLimiter(rdb.Client, 120)

	// Per-IP rate limiting for public endpoints (version-check, firebase-config)
	ipRateLimiter := middleware.NewIPRateLimiter(rdb.Client, 30) // 30 req/min per IP

	// Auth routes — protected against brute force
	mux.Handle("POST /api/v1/auth/register", bfProtector.Protect("register")(http.HandlerFunc(authHandler.Register)))
	mux.Handle("POST /api/v1/auth/login", bfProtector.Protect("login")(http.HandlerFunc(authHandler.Login)))
	mux.Handle("POST /api/v1/auth/login/2fa", bfProtector.Protect("login-2fa")(http.HandlerFunc(authHandler.Login2FA)))
	mux.HandleFunc("POST /api/v1/auth/refresh", authHandler.RefreshToken)
	mux.Handle("GET /api/v1/auth/profile", authMiddleware.JWTAuth(http.HandlerFunc(authHandler.GetProfile)))
	mux.Handle("PUT /api/v1/auth/profile", authMiddleware.JWTAuth(http.HandlerFunc(authHandler.UpdateProfile)))
	mux.Handle("POST /api/v1/auth/change-password", authMiddleware.JWTAuth(http.HandlerFunc(authHandler.ChangePassword)))

	// 2FA routes
	mux.Handle("POST /api/v1/auth/2fa/setup", authMiddleware.JWTAuth(http.HandlerFunc(twoFAHandler.Setup)))
	mux.Handle("POST /api/v1/auth/2fa/verify", authMiddleware.JWTAuth(http.HandlerFunc(twoFAHandler.Verify)))
	mux.Handle("GET /api/v1/auth/2fa/status", authMiddleware.JWTAuth(http.HandlerFunc(twoFAHandler.Status)))
	mux.Handle("POST /api/v1/auth/2fa/disable", authMiddleware.JWTAuth(http.HandlerFunc(twoFAHandler.Disable)))

	// Message routes (rate-limited + versioned + plan-checked)
	// APIKeyAuth sets accountID → RequireActiveAccount blocks suspended/disabled → EnforceQuota blocks over-quota → rate limit → version check → handler
	apiKeyPlanChain := func(next http.Handler) http.Handler {
		return planMiddleware.RequireActiveAccount(planMiddleware.EnforceQuota(next))
	}
	mux.Handle("POST /api/v1/send", versionMiddleware(apiKeyRateLimiter.Limit(authMiddleware.APIKeyAuth(apiKeyPlanChain(http.HandlerFunc(messageHandler.Send))))))
	mux.Handle("GET /api/v1/messages", authMiddleware.APIKeyAuth(http.HandlerFunc(messageHandler.ListMessages)))
	mux.Handle("GET /api/v1/messages/{id}", authMiddleware.APIKeyAuth(http.HandlerFunc(messageHandler.GetMessage)))
	mux.Handle("GET /api/v1/messages/{id}/confidence", authMiddleware.APIKeyAuth(http.HandlerFunc(messageHandler.GetConfidence)))

	// Bulk SMS and scheduling routes (plan-checked + rate-limited)
	mux.Handle("POST /api/v1/send/bulk", versionMiddleware(apiKeyRateLimiter.Limit(authMiddleware.APIKeyAuth(apiKeyPlanChain(http.HandlerFunc(messageHandler.BulkSend))))))
	mux.Handle("POST /api/v1/send/schedule", versionMiddleware(apiKeyRateLimiter.Limit(authMiddleware.APIKeyAuth(http.HandlerFunc(messageHandler.ScheduleSend)))))

	// OTP routes (plan-checked + rate-limited)
	mux.Handle("POST /api/v1/otp/send", authMiddleware.APIKeyAuth(apiKeyPlanChain(http.HandlerFunc(otpHandler.Send))))
	mux.Handle("POST /api/v1/otp/verify", authMiddleware.APIKeyAuth(http.HandlerFunc(otpHandler.Verify)))

	// Device routes — brute force protected
	mux.Handle("POST /api/v1/devices/login", bfProtector.Protect("device-login")(http.HandlerFunc(deviceHandler.DeviceLogin)))
	mux.HandleFunc("POST /api/v1/devices/register", deviceHandler.Register)
	mux.Handle("POST /api/v1/devices/qr-login", bfProtector.Protect("device-qr-login")(http.HandlerFunc(qrPairingHandler.QRLogin)))
	mux.Handle("POST /api/v1/devices/status", authMiddleware.JWTAuth(http.HandlerFunc(deviceHandler.HandleStatusUpdate)))
	mux.Handle("POST /api/v1/devices/deregister", authMiddleware.JWTAuth(http.HandlerFunc(deviceHandler.Deregister)))
	mux.Handle("POST /api/v1/devices", authMiddleware.JWTAuth(http.HandlerFunc(deviceHandler.RegisterDeprecated)))
	mux.Handle("GET /api/v1/devices", authMiddleware.JWTAuth(http.HandlerFunc(deviceHandler.List)))
	mux.Handle("GET /api/v1/devices/{id}", authMiddleware.JWTAuth(http.HandlerFunc(deviceHandler.Get)))
	mux.Handle("POST /api/v1/devices/info", authMiddleware.JWTAuth(http.HandlerFunc(deviceHandler.HandleDeviceInfo)))

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
	mux.Handle("GET /api/v1/admin/webhooks", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.ListAllWebhooks)))
	mux.Handle("POST /api/v1/webhooks", authMiddleware.AdminAuth(http.HandlerFunc(webhookHandler.Create)))
	mux.Handle("GET /api/v1/webhooks/{id}", authMiddleware.AdminAuth(http.HandlerFunc(webhookHandler.Get)))
	mux.Handle("PUT /api/v1/webhooks/{id}", authMiddleware.AdminAuth(http.HandlerFunc(webhookHandler.Update)))
	mux.Handle("DELETE /api/v1/webhooks/{id}", authMiddleware.AdminAuth(http.HandlerFunc(webhookHandler.Delete)))
	mux.Handle("POST /api/v1/webhooks/{id}/rotate-secret", authMiddleware.AdminAuth(http.HandlerFunc(webhookHandler.RotateSecret)))
	mux.Handle("GET /api/v1/webhooks/{id}/deliveries", authMiddleware.AdminAuth(http.HandlerFunc(webhookHandler.ListDeliveries)))
	mux.Handle("POST /api/v1/webhooks/{id}/test", authMiddleware.AdminAuth(http.HandlerFunc(webhookHandler.TestWebhook)))

	// Billing routes
	mux.Handle("GET /api/v1/plans", authMiddleware.JWTAuth(http.HandlerFunc(billingHandler.ListPlans)))
	mux.Handle("GET /api/v1/plans/{id}", authMiddleware.JWTAuth(http.HandlerFunc(billingHandler.GetPlan)))
	mux.Handle("POST /api/v1/plans", authMiddleware.AdminAuth(http.HandlerFunc(billingHandler.CreatePlan)))
	mux.Handle("PUT /api/v1/plans/{id}", authMiddleware.AdminAuth(http.HandlerFunc(billingHandler.UpdatePlan)))
	mux.Handle("DELETE /api/v1/plans/{id}", authMiddleware.AdminAuth(http.HandlerFunc(billingHandler.DeletePlan)))

	// Plan change requests (maker-checker: staff submits, admin reviews)
	mux.Handle("POST /api/v1/plan-requests", authMiddleware.JWTAuth(http.HandlerFunc(planChangeRequestHandler.Submit)))
	mux.Handle("GET /api/v1/admin/plan-requests", authMiddleware.AdminAuth(http.HandlerFunc(planChangeRequestHandler.ListAll)))
	mux.Handle("POST /api/v1/admin/plan-requests/{id}/approve", authMiddleware.AdminAuth(http.HandlerFunc(planChangeRequestHandler.Approve)))
	mux.Handle("POST /api/v1/admin/plan-requests/{id}/reject", authMiddleware.AdminAuth(http.HandlerFunc(planChangeRequestHandler.Reject)))
	mux.Handle("GET /api/v1/billing/invoice", authMiddleware.JWTAuth(http.HandlerFunc(billingHandler.GetInvoice)))
	mux.Handle("GET /api/v1/billing/usage", authMiddleware.JWTAuth(http.HandlerFunc(billingHandler.GetUsage)))

	// Fraud check (API key auth)
	mux.Handle("POST /api/v1/fraud/check", authMiddleware.APIKeyAuth(http.HandlerFunc(fraudHandler.Check)))

	// Member portal routes (JWTAuth → plan check → rate limit → handler)
	// PlanMiddleware blocks suspended accounts and canceled subscriptions.
	memberChain := func(next http.Handler) http.Handler {
		return planMiddleware.MemberPlanCheck(memberRateLimiter.Limit(next))
	}
	mux.Handle("GET /api/v1/member/dashboard", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.GetDashboard))))
	mux.Handle("GET /api/v1/member/devices", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.GetDevices))))
	mux.Handle("PUT /api/v1/member/devices/{id}", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.UpdateDevice))))
	mux.Handle("DELETE /api/v1/member/devices/{id}", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.DeleteDevice))))
	mux.Handle("GET /api/v1/member/messages", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.GetMessages))))
	mux.Handle("POST /api/v1/member/send", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(messageHandler.MemberSend))))
	mux.Handle("GET /api/v1/member/analytics", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.GetAnalytics))))
	mux.Handle("GET /api/v1/member/stats", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.GetStats))))

	// Member plan info route
	mux.Handle("GET /api/v1/member/plan", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.GetPlan))))

	// QR pairing route (member portal generates QR code for device pairing)
	mux.Handle("POST /api/v1/member/devices/qr-code", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(qrPairingHandler.GenerateQRCode))))

	// Member template routes (scoped to the member's account + plan checked)
	mux.Handle("GET /api/v1/member/templates", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.ListTemplates))))
	mux.Handle("POST /api/v1/member/templates", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.CreateTemplate))))
	mux.Handle("GET /api/v1/member/templates/{id}", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.GetTemplate))))
	mux.Handle("PUT /api/v1/member/templates/{id}", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.UpdateTemplate))))
	mux.Handle("DELETE /api/v1/member/templates/{id}", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.DeleteTemplate))))

	// Member webhook routes (scoped to the member's account + plan checked)
	mux.Handle("GET /api/v1/member/webhooks", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.ListWebhooks))))
	mux.Handle("POST /api/v1/member/webhooks", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.CreateWebhook))))
	mux.Handle("GET /api/v1/member/webhooks/{id}", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.GetWebhook))))
	mux.Handle("PUT /api/v1/member/webhooks/{id}", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.UpdateWebhook))))
	mux.Handle("DELETE /api/v1/member/webhooks/{id}", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.DeleteWebhook))))
	mux.Handle("POST /api/v1/member/webhooks/{id}/rotate-secret", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.RotateWebhookSecret))))
	mux.Handle("GET /api/v1/member/webhooks/{id}/deliveries", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.GetWebhookDeliveries))))
	mux.Handle("POST /api/v1/member/webhooks/{id}/test", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.TestWebhook))))

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
	mux.Handle("GET /api/v1/admin/templates", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.ListAllTemplates)))
	mux.Handle("POST /api/v1/admin/templates/{id}/approve", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.ApproveTemplate)))
	mux.Handle("POST /api/v1/admin/templates/{id}/reject", authMiddleware.AdminAuth(http.HandlerFunc(adminHandler.RejectTemplate)))
	mux.Handle("GET /api/v1/admin/fraud-flags", authMiddleware.AdminAuth(http.HandlerFunc(fraudHandler.ListFlags)))
	mux.Handle("POST /api/v1/admin/fraud-flags/{id}/review", authMiddleware.AdminAuth(http.HandlerFunc(fraudHandler.ReviewFlag)))
	mux.Handle("GET /api/v1/admin/abuse-flags", authMiddleware.AdminAuth(http.HandlerFunc(fraudHandler.ListAbuseFlags)))
	mux.Handle("GET /api/v1/admin/smishing-flags", authMiddleware.AdminAuth(http.HandlerFunc(fraudHandler.ListSmishingFlags)))
	mux.Handle("GET /api/v1/admin/smishing-flags/count", authMiddleware.AdminAuth(http.HandlerFunc(fraudHandler.SmishingFlagsCount)))
	mux.Handle("POST /api/v1/admin/smishing-flags/bulk-review", authMiddleware.AdminAuth(http.HandlerFunc(fraudHandler.BulkReviewSmishingFlags)))

	// Admin user management routes
	mux.Handle("GET /api/v1/admin/users", authMiddleware.AdminAuth(http.HandlerFunc(userHandler.List)))
	mux.Handle("GET /api/v1/admin/users/{id}", authMiddleware.AdminAuth(http.HandlerFunc(userHandler.Get)))
	mux.Handle("POST /api/v1/admin/users", authMiddleware.AdminAuth(http.HandlerFunc(userHandler.Create)))
	mux.Handle("PUT /api/v1/admin/users/{id}", authMiddleware.AdminAuth(http.HandlerFunc(userHandler.Update)))
	mux.Handle("DELETE /api/v1/admin/users/{id}", authMiddleware.AdminAuth(http.HandlerFunc(userHandler.Delete)))
	mux.Handle("POST /api/v1/admin/users/bulk-delete", authMiddleware.AdminAuth(http.HandlerFunc(userHandler.BulkDelete)))
	mux.Handle("POST /api/v1/admin/users/bulk-update", authMiddleware.AdminAuth(http.HandlerFunc(userHandler.BulkUpdate)))

	// Payment config routes (admin settings)
	mux.Handle("GET /api/v1/admin/payment-configs", authMiddleware.AdminAuth(http.HandlerFunc(paymentConfigHandler.List)))
	mux.Handle("GET /api/v1/payment-configs", authMiddleware.JWTAuth(http.HandlerFunc(paymentConfigHandler.ListEnabled)))
	mux.Handle("PUT /api/v1/admin/payment-configs/{id}", authMiddleware.AdminAuth(http.HandlerFunc(paymentConfigHandler.Update)))
	mux.Handle("POST /api/v1/admin/payment-configs", authMiddleware.AdminAuth(http.HandlerFunc(paymentConfigHandler.Upsert)))

	// Payment request routes (member creates, admin approves)
	mux.Handle("GET /api/v1/admin/payment-requests", authMiddleware.AdminAuth(http.HandlerFunc(paymentRequestHandler.List)))
	mux.Handle("GET /api/v1/admin/payment-requests/{id}", authMiddleware.AdminAuth(http.HandlerFunc(paymentRequestHandler.GetByID)))
	mux.Handle("POST /api/v1/admin/payment-requests/{id}/approve", authMiddleware.AdminAuth(http.HandlerFunc(paymentRequestHandler.Approve)))
	mux.Handle("POST /api/v1/admin/payment-requests/{id}/reject", authMiddleware.AdminAuth(http.HandlerFunc(paymentRequestHandler.Reject)))
	mux.Handle("POST /api/v1/member/payment-requests", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(paymentRequestHandler.Create))))
	mux.Handle("GET /api/v1/member/payment-requests", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(paymentRequestHandler.ListByAccount))))

	// Subscription request routes (member upgrade, admin approve/reject)
	mux.Handle("GET /api/v1/admin/subscription-requests", authMiddleware.AdminAuth(http.HandlerFunc(subscriptionRequestHandler.List)))
	mux.Handle("POST /api/v1/admin/subscription-requests/{id}/approve", authMiddleware.AdminAuth(http.HandlerFunc(subscriptionRequestHandler.Approve)))
	mux.Handle("POST /api/v1/admin/subscription-requests/{id}/reject", authMiddleware.AdminAuth(http.HandlerFunc(subscriptionRequestHandler.Reject)))
	mux.Handle("POST /api/v1/member/subscription-requests", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(subscriptionRequestHandler.Create))))
	mux.Handle("GET /api/v1/member/subscription-requests", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(subscriptionRequestHandler.ListByAccount))))

	// Member preferences routes (plan checked + rate limited)
	mux.Handle("GET /api/v1/member/preferences", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.GetPreferences))))
	mux.Handle("PUT /api/v1/member/preferences", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.UpdatePreferences))))
	mux.Handle("POST /api/v1/member/kyc", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.SubmitKYC))))
	mux.Handle("GET /api/v1/member/kyc", authMiddleware.JWTAuth(memberChain(http.HandlerFunc(memberHandler.GetKYC))))

	// Session management routes
	mux.Handle("GET /api/v1/auth/sessions", authMiddleware.JWTAuth(http.HandlerFunc(sessionHandler.ListSessions)))
	mux.Handle("DELETE /api/v1/auth/sessions", authMiddleware.JWTAuth(http.HandlerFunc(sessionHandler.RevokeAllSessions)))
	mux.Handle("DELETE /api/v1/auth/sessions/{id}", authMiddleware.JWTAuth(http.HandlerFunc(sessionHandler.RevokeSession)))

	// Admin KYC review routes
	mux.Handle("GET /api/v1/admin/kyc", authMiddleware.AdminAuth(http.HandlerFunc(kycAdminHandler.List)))
	mux.Handle("POST /api/v1/admin/kyc/{id}/approve", authMiddleware.AdminAuth(http.HandlerFunc(kycAdminHandler.Approve)))
	mux.Handle("POST /api/v1/admin/kyc/{id}/reject", authMiddleware.AdminAuth(http.HandlerFunc(kycAdminHandler.Reject)))

	// Contact sales submission routes
	mux.Handle("GET /api/v1/admin/contact-submissions", authMiddleware.AdminAuth(http.HandlerFunc(contactSalesHandler.ListSubmissions)))
	mux.Handle("PUT /api/v1/admin/contact-submissions/{id}", authMiddleware.AdminAuth(http.HandlerFunc(contactSalesHandler.UpdateStatus)))

	// Admin bulk operations for webhooks & templates
	webhookBulkHandler := handlers.NewAdminWebhookBulkHandler(pg.Pool)
	templateBulkHandler := handlers.NewAdminTemplateBulkHandler(pg.Pool)
	mux.Handle("POST /api/v1/admin/webhooks/bulk-delete", authMiddleware.AdminAuth(http.HandlerFunc(webhookBulkHandler.BulkDelete)))
	mux.Handle("POST /api/v1/admin/templates/bulk-delete", authMiddleware.AdminAuth(http.HandlerFunc(templateBulkHandler.BulkDelete)))
	mux.Handle("POST /api/v1/admin/templates/bulk-approve", authMiddleware.AdminAuth(http.HandlerFunc(templateBulkHandler.BulkApprove)))
	mux.Handle("POST /api/v1/admin/templates/bulk-reject", authMiddleware.AdminAuth(http.HandlerFunc(templateBulkHandler.BulkReject)))

	// BI dashboard routes
	biHandler := handlers.NewBIHandler(pg.Pool)
	mux.Handle("GET /api/v1/admin/bi", authMiddleware.AdminAuth(http.HandlerFunc(biHandler.GetBIDashboard)))

	// FCM token registration (device push notifications)
	fcmHandler := handlers.NewFCMTokenHandler(pg.Pool, metrics)
	mux.Handle("POST /api/v1/auth/fcm-token", authMiddleware.JWTAuth(http.HandlerFunc(fcmHandler.RegisterFCMToken)))

	// Feature catalog routes
	featureCatalogHandler := handlers.NewFeatureCatalogHandler(pg.Pool)
	mux.HandleFunc("GET /api/v1/feature-catalog", featureCatalogHandler.List)
	mux.Handle("POST /api/v1/admin/feature-catalog", authMiddleware.AdminAuth(http.HandlerFunc(featureCatalogHandler.Create)))
	mux.Handle("PUT /api/v1/admin/feature-catalog/{id}", authMiddleware.AdminAuth(http.HandlerFunc(featureCatalogHandler.UpdateStatus)))
	mux.Handle("DELETE /api/v1/admin/feature-catalog/{id}", authMiddleware.AdminAuth(http.HandlerFunc(featureCatalogHandler.Delete)))
	mux.Handle("POST /api/v1/admin/feature-catalog/{id}/reorder", authMiddleware.AdminAuth(http.HandlerFunc(featureCatalogHandler.Reorder)))

	// App release management routes
	mux.Handle("GET /api/v1/admin/releases", authMiddleware.JWTAuth(http.HandlerFunc(releaseHandler.List)))
	mux.Handle("POST /api/v1/admin/releases", authMiddleware.JWTAuth(http.HandlerFunc(releaseHandler.Create)))
	mux.Handle("GET /api/v1/admin/releases/{id}", authMiddleware.JWTAuth(http.HandlerFunc(releaseHandler.Get)))
	mux.Handle("POST /api/v1/admin/releases/{id}/submit", authMiddleware.JWTAuth(http.HandlerFunc(releaseHandler.Submit)))
	mux.Handle("POST /api/v1/admin/releases/{id}/approve", authMiddleware.AdminAuth(http.HandlerFunc(releaseHandler.Approve)))
	mux.Handle("POST /api/v1/admin/releases/{id}/reject", authMiddleware.AdminAuth(http.HandlerFunc(releaseHandler.Reject)))
	mux.Handle("POST /api/v1/admin/releases/{id}/release", authMiddleware.AdminAuth(http.HandlerFunc(releaseHandler.Release)))
	mux.Handle("DELETE /api/v1/admin/releases/{id}", authMiddleware.AdminAuth(http.HandlerFunc(releaseHandler.Delete)))
	mux.Handle("POST /api/v1/admin/releases/{id}/upload", authMiddleware.JWTAuth(http.HandlerFunc(releaseHandler.UploadAPK)))
	mux.Handle("GET /api/v1/version-check", ipRateLimiter.Limit(http.HandlerFunc(releaseHandler.VersionCheck)))

	// AI configuration routes
	mux.Handle("GET /api/v1/admin/ai/configs", authMiddleware.AdminAuth(http.HandlerFunc(aiHandler.ListConfigs)))
	mux.Handle("GET /api/v1/admin/ai/configs/{id}", authMiddleware.AdminAuth(http.HandlerFunc(aiHandler.GetConfig)))
	mux.Handle("POST /api/v1/admin/ai/configs", authMiddleware.JWTAuth(http.HandlerFunc(aiHandler.CreateConfig)))
	mux.Handle("PUT /api/v1/admin/ai/configs/{id}", authMiddleware.JWTAuth(http.HandlerFunc(aiHandler.UpdateConfig)))
	mux.Handle("DELETE /api/v1/admin/ai/configs/{id}", authMiddleware.JWTAuth(http.HandlerFunc(aiHandler.DeleteConfig)))

	// AI config change requests (maker-checker: staff/viewer submits, admin approves/rejects)
	mux.Handle("GET /api/v1/admin/ai/change-requests", authMiddleware.AdminAuth(http.HandlerFunc(aiHandler.ListChangeRequests)))
	mux.Handle("POST /api/v1/admin/ai/change-requests/{id}/approve", authMiddleware.AdminAuth(http.HandlerFunc(aiHandler.ApproveChangeRequest)))
	mux.Handle("POST /api/v1/admin/ai/change-requests/{id}/reject", authMiddleware.AdminAuth(http.HandlerFunc(aiHandler.RejectChangeRequest)))

	// AI template generation (requires JWT auth — available to admin and member portal)
	mux.Handle("POST /api/v1/ai/generate-template", authMiddleware.JWTAuth(http.HandlerFunc(aiHandler.GenerateTemplate)))

	// Firebase config management routes
	mux.Handle("GET /api/v1/admin/firebase-config", authMiddleware.JWTAuth(http.HandlerFunc(firebaseConfigHandler.List)))
	mux.Handle("PUT /api/v1/admin/firebase-config", authMiddleware.AdminAuth(http.HandlerFunc(firebaseConfigHandler.BulkUpdate)))
	mux.Handle("PUT /api/v1/admin/firebase-config/{key}", authMiddleware.AdminAuth(http.HandlerFunc(firebaseConfigHandler.Upsert)))
	mux.Handle("DELETE /api/v1/admin/firebase-config/{key}", authMiddleware.AdminAuth(http.HandlerFunc(firebaseConfigHandler.Delete)))
	mux.HandleFunc("GET /api/v1/firebase-config", firebaseConfigHandler.PublicConfig)

	// Static file serving for uploaded APKs
	mux.Handle("GET /api/v1/uploads/apks/", http.StripPrefix("/api/v1/uploads/apks/", http.FileServer(http.Dir("uploads/apks"))))

	// SSE (Server-Sent Events) for real-time device status updates
	if sseHandler != nil {
		// Support both JWT Bearer header and ?token= query param (for EventSource connections)
		sseMux := http.NewServeMux()
		sseMux.Handle("GET /api/v1/events", authMiddleware.JWTAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			accountID := middleware.GetAccountID(r.Context())
			if accountID == "" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				w.Write([]byte(`{"error":"unauthorized"}`))
				return
			}
			sseHandler.Subscribe(w, r, accountID)
		})))
		// Also handle SSE connections with ?token= query param (used by frontend EventSource)
		mux.HandleFunc("GET /api/v1/events/stream", func(w http.ResponseWriter, r *http.Request) {
			token := r.URL.Query().Get("token")
			if token == "" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				w.Write([]byte(`{"error":"missing token"}`))
				return
			}
			// Set the Authorization header so JWTAuth middleware can read it
			r.Header.Set("Authorization", "Bearer "+token)
			sseMux.ServeHTTP(w, r)
		})
	}

	return mux
}
