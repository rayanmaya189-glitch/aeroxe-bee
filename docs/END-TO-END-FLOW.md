# AeroXe Bee — End-to-End Platform Flow

> **Aeroxe Enterprises Pvt. Ltd., Jalgaon, Maharashtra, India**
>
> A complete SMS gateway platform that turns Android phones into SMS delivery infrastructure.
> Backend (Go) + Frontend (React) + Android (Kotlin) + MQTT (Mosquitto) + PostgreSQL + Redis.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Phase 1: Platform Setup & Infrastructure](#2-phase-1-platform-setup--infrastructure)
3. [Phase 2: Authentication & Account Management](#3-phase-2-authentication--account-management)
4. [Phase 3: Device Registration & MQTT Connection](#4-phase-3-device-registration--mqtt-connection)
5. [Phase 4: SMS Sending Pipeline](#5-phase-4-sms-sending-pipeline)
6. [Phase 5: Delivery Tracking & Status Reporting](#6-phase-5-delivery-tracking--status-reporting)
7. [Phase 6: Admin Dashboard & Monitoring](#7-phase-6-admin-dashboard--monitoring)
8. [Phase 7: Member Portal](#8-phase-7-member-portal)
9. [Phase 8: Webhooks & Integrations](#9-phase-8-webhooks--integrations)
10. [Phase 9: Billing & Subscriptions](#10-phase-9-billing--subscriptions)
11. [Phase 10: Security & Hardening](#11-phase-10-security--hardening)
12. [Frontend ↔ Backend Communication](#12-frontend--backend-communication)
13. [Android ↔ Backend Communication](#13-android--backend-communication)
14. [MQTT Protocol Deep Dive](#14-mqtt-protocol-deep-dive)
15. [Starting & Stopping Servers](#15-starting--stopping-servers)
16. [Environment Variables Reference](#16-environment-variables-reference)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AEROXE BEE PLATFORM                         │
├─────────────┬─────────────┬─────────────┬───────────────────────────┤
│  Frontend   │  Backend    │  Android    │  Infrastructure           │
│  (React)    │  (Go)       │  (Kotlin)   │                           │
├─────────────┼─────────────┼─────────────┼───────────────────────────┤
│ Vite + React │ net/http    │ Retrofit    │ PostgreSQL 18             │
│ Tailwind    │ pgx v5      │ Room DB     │ Redis 7                   │
│ TanStack    │ go-redis    │ Paho MQTT   │ Mosquitto 2.x             │
│ Zustand     │ JWT + API   │ Hilt DI     │ Docker Compose            │
│ Axios       │ Redis Queue │ Paho MQTT   │                           │
└──────┬──────┴──────┬──────┴──────┬──────┴───────────────────────────┘
       │             │             │
       │  HTTP       │  MQTT       │  MQTT
       └─────┐       └──────┬──────┘
             │              │
             ▼              ▼
    ┌─────────────────────────────┐
    │      Mosquitto Broker       │
    │  (per-device ACL isolation) │
    └─────────────────────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Backend API | Go 1.22+, net/http, pgx v5 | REST API, message processing, worker queues |
| Frontend | React 19, Vite 8, Tailwind 4, TanStack Query | Admin dashboard + member portal (SPA) |
| Android | Kotlin, Jetpack Compose, Hilt, Paho MQTT | SMS sending client on physical devices |
| Database | PostgreSQL 18 | Source of truth for all data |
| Cache/Queue | Redis 7 (Streams) | Rate limiting, message queues, circuit breakers |
| MQTT Broker | Mosquitto 2.x | Real-time command/control between backend and devices |
| Containerization | Docker Compose | Orchestrates all 4 backend services |

### Data Flow Summary

```
Client (Browser/App) ──HTTP──▶ Backend ──Redis Stream──▶ Worker ──MQTT──▶ Android Device
                                                                         │
Client (Browser/App) ◀──HTTP── Backend ◀──Redis── DB    ◀──MQTT─────────┘
```

---

## 2. Phase 1: Platform Setup & Infrastructure

### 2.1 Docker Compose Services

The platform runs 4 services orchestrated by Docker Compose:

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `postgres` | `postgres:18-alpine` | 5432 | Primary database |
| `redis` | `redis:7-alpine` | 6379 | Caching, queues, rate limiting |
| `mosquitto` | Custom (eclipse-mosquitto:2) | 1883, 9001 | MQTT broker |
| `backend` | Custom (Go binary) | 8080, 9090 | API server + Prometheus metrics |

### 2.2 Service Dependencies

```
backend
  ├── depends_on: postgres (healthy)
  ├── depends_on: redis (healthy)
  └── depends_on: mosquitto (healthy)

mosquitto
  └── depends_on: postgres (healthy)
```

### 2.3 Volume Mounts

| Volume | Container Path | Purpose |
|--------|---------------|---------|
| `pgdata` | `/var/lib/postgresql` | PostgreSQL data persistence |
| `redisdata` | `/data` | Redis data persistence |
| `mqttdata` | `/mosquitto/data` | Mosquitto persistence files |
| `mqtt_auth` | `/mosquitto/auth` | Mosquitto password + ACL files |
| `./backend/migrations` | `/docker-entrypoint-initdb.d/` | Auto-runs SQL migrations on first start |

### 2.4 Database Migrations

Migrations are in `backend/migrations/` and run automatically when the PostgreSQL container starts for the first time:

```
001_init.sql              → Core tables (accounts, devices, messages, api_keys, etc.)
002_add_users_table.sql   → Admin/staff user accounts
003_add_2fa_and_preferences.sql → 2FA + user preferences
003_add_device_name.sql   → Device naming
004_add_mqtt_encrypted_password.sql → Encrypted MQTT credentials
004_payment_configs_and_subscription_requests.sql → Billing
005_add_mqtt_auth_index.sql → MQTT credential lookup optimization
006_plan_visibility.sql   → Plan visibility (public/private/custom)
```

### 2.5 Mosquitto Configuration

The broker uses a custom Dockerfile (`backend/mosquitto/Dockerfile`) that:

1. Installs `su-exec` for privilege dropping
2. Creates `/mosquitto/{auth,data,config}` with UID 1883 ownership
3. The entrypoint script creates a password file and fixes volume permissions at runtime
4. Drops from root to UID 1883 (mosquitto user) via `su-exec` before starting the broker

**ACL Rules** (`backend/mosquitto/acl`):

```mosquitto
# Backend service: full access to all device topics
user backend
topic readwrite devices/#
topic readwrite backend/#

# Per-device isolation: each device can only access its own topic tree
# Devices connect with username = deviceID (e.g., "ABC123-sim1")
pattern readwrite devices/%u/#
```

**Key security property:** Device "ABC123-sim1" (connecting as username `ABC123-sim1`) can only access `devices/ABC123-sim1/#`. Cross-device communication is blocked at the broker level.

---

## 3. Phase 2: Authentication & Account Management

### 3.1 User Roles

| Role | Access | Frontend Routes |
|------|--------|----------------|
| `admin` | Full platform access | Admin dashboard (15 routes) |
| `staff` | Read-only admin + own member portal | Member portal (7 routes) + limited admin |
| `viewer` | Read-only member portal | Member portal only |

### 3.2 Login Flow (Frontend)

```
1. User navigates to /login
2. LoginPage.tsx → calls auth.ts login({ email, password })
3. Axios POST /api/v1/auth/login
4. Backend: AuthHandler.Login()
   ├── Brute force check (5 attempts / 15min window / 30min lockout)
   ├── Query users table by email
   ├── bcrypt.Compare password hash
   ├── If 2FA enabled → return { requires_2fa: true, two_fa_token }
   │   └── Frontend shows 2FA code input → POST /auth/login/2fa
   ├── Generate JWT access token (15min TTL)
   ├── Generate refresh token (7 day TTL)
   ├── Store session in sessions table
   └── Return { token, refreshToken, user: { id, email, name, role } }
5. authStore.login() → stores in sessionStorage
6. Redirect to /dashboard (admin) or /member (staff)
```

### 3.3 Token Refresh Flow

```
1. Axios response interceptor catches 401 errors
2. Checks if refresh_token exists in sessionStorage
3. POST /api/v1/auth/refresh with refreshToken
4. Backend: AuthHandler.RefreshToken()
   ├── Validates refresh token against sessions table
   ├── Generates new access token
   └── Returns { token }
5. Retries the original failed request with new token
6. Queue of concurrent requests all get the new token
```

### 3.4 2FA (TOTP) Flow

```
Setup:
1. SettingsPage → calls setup2FA() → POST /auth/2fa/setup
2. Backend generates TOTP secret, returns QR code URI
3. User scans QR with Google Authenticator
4. User enters 6-digit code → POST /auth/2fa/verify
5. Backend verifies code, enables 2FA for the account

Login with 2FA:
1. POST /auth/login → returns { requires_2fa: true, two_fa_token }
2. Frontend shows 2FA input screen
3. POST /auth/login/2fa with { token, code }
4. Backend verifies TOTP code, issues JWT
```

---

## 4. Phase 3: Device Registration & MQTT Connection

### 4.1 Android Device Login Flow

```
1. Android: RegistrationViewModel.loginDevice(email, password)
2. DeviceRepository.loginDevice()
   ├── Gets Android ID as physical device ID
   ├── Gets SIM slot info, carrier, phone number
   └── POST /api/v1/devices/login
       ├── Body: { email, password, device_id, sim_slot }
       ├── Brute force protected (5 attempts / 15min)
       ├── Backend: DeviceHandler.DeviceLogin()
       │   ├── Validates credentials against accounts table
       │   ├── Finds or creates device record
       │   ├── Creates JWT token for the device
       │   ├── Creates or retrieves per-device MQTT credentials
       │   │   ├── Username = deviceID (e.g., "ABC123-sim1")
       │   │   ├── Password = encrypted random string
       │   │   └── Stored in mqtt_credentials table (AES-256-GCM)
       │   └── Returns { token, device_id, mqtt: { broker_url, username, password } }
       └── DeviceRepository saves all credentials in TokenManager (SharedPreferences)
3. MqttService.start() → foreground service
4. MqttManager.connect(brokerUrl, clientId, username, password)
   ├── Options: cleanSession=false, keepAlive=60s, QoS=2
   ├── Subscribe: devices/{id}/commands, devices/{id}/pong
   └── Start heartbeat: publish devices/{id}/ping every 30s
```

### 4.2 MQTT Connection Lifecycle

```
App Start
  → RegistrationViewModel → POST /devices/login
  → Receives JWT + MQTT credentials
  → TokenManager stores: brokerUrl, username(deviceID), password
  → MqttService.start() → foreground service with persistent notification

MqttService.onCreate()
  → MqttManager.connect(brokerUrl, clientId, username, password)
  → Subscribe: devices/{id}/commands, devices/{id}/pong
  → Start heartbeat: publish devices/{id}/ping every 30s
  → Start retry processor: picks up failed SMS tasks every 60s
  → Start connection monitor: updates notification on connect/disconnect

On Disconnect → Exponential backoff: 5s → 10s → 20s → 40s → 60s (max)
  → On reconnect → resubscribeAll() to previously subscribed topics

On Command Received (devices/{id}/commands)
  → Parse SMSCommand → save to Room DB → SMSEngine.send()
  → Publish status report to devices/{id}/status

On Pong Received (devices/{id}/pong)
  → Publish ACK to devices/{id}/ack

On SMS Send Failure
  → Task stays in Room DB as FAILED
  → Retry processor picks it up every 60s (up to 3 retries)
```

### 4.3 Device Reconnection & Watchdog

The Android app has multiple layers of reliability:

| Component | Purpose | Trigger |
|-----------|---------|---------|
| `MqttService` | Foreground service, manages MQTT lifecycle | App start, boot |
| `MqttManager` | Paho MQTT client with auto-reconnect | Connection loss |
| `WatchdogScheduler` | Periodic check that MQTT service is running | Every 15 minutes |
| `BootReceiver` | Restarts services after device reboot | Boot completed |
| `JobSchedulerFallback` | Ensures MQTT service runs even if foreground service is killed | Periodic |
| `FCMRevivalService` | Firebase Cloud Messaging revival | FCM push |

---

## 5. Phase 4: SMS Sending Pipeline

### 5.1 End-to-End SMS Flow

```
Step 1: API Request
  Client → POST /api/v1/send
  Headers: Authorization: Bearer <api_key>
  Body: { recipient, message, message_type, sender, routing_strategy }
  Auth: API Key validation + Per-API-key rate limiting (Redis fixed-window)
  
Step 2: Validation & Enqueue
  MessageHandler.Send()
  ├── Idempotency check (Redis: idemp:{key})
  ├── Account lookup + subscription validation
  ├── Message type classification (OTP/Transactional/Marketing)
  ├── Encryption (if master key configured)
  ├── Push to Redis Stream based on message_type:
  │   ├── OTP → otp_queue (highest priority)
  │   ├── Transactional → transactional_queue
  │   └── Marketing → marketing_queue
  └── Return { message_id, status: "queued" }

Step 3: Worker Processing (runs N workers, default 3)
  Queue Consumer picks message → checks:
  ├── Account circuit breaker (is account blocked?)
  ├── Fraud detection (is message suspicious?)
  ├── Get eligible devices (online, not blocked, CB closed)
  ├── Cost-based routing (SIM health + carrier reliability + country match)
  ├── Device circuit breaker (is device blocked?)
  ├── Carrier throttle check (is carrier overloaded?)
  ├── Device rate check (is device at rate limit?)
  ├── SIM health evaluation (healthy/degraded/blocked?)
  └── MQTT broker connected?

Step 4: MQTT Dispatch
  Backend → MQTT Publish: devices/{deviceID}/commands
  Payload: {
    "id": "msg-uuid",
    "account_id": "acct-uuid",
    "recipient": "+1234567890",
    "message": "Your OTP is 123456",
    "sender": "AeroXe",
    "priority": "HIGH",
    "sim_slot": 0,
    "timestamp": 1720000000000
  }

Step 5: Android Execution
  MqttService receives → parses SMSCommand → SMSEngine.send()
  ├── Check SMS permission
  ├── Rate limit check (per-SIM slot)
  ├── Get SmsManager for SIM slot
  ├── Divide message into parts (max 5 parts)
  ├── Send via Android SmsManager API
  │   ├── Single part: sendTextMessage()
  │   └── Multi-part: sendMultipartTextMessage()
  ├── Record rate limit
  ├── Mark task as SENT in Room DB
  └── Return Status.SENT

Step 6: Status Report
  Android → MQTT Publish: devices/{deviceID}/status
  Payload: {
    "message_id": "msg-uuid",
    "device_id": "dev-uuid",
    "status": "SENT",
    "delivery_status": "SENT",
    "confidence_score": 1.0,
    "sim_slot": 0,
    "timestamp": 1720000001000
  }

Step 7: Backend Processing
  Backend receives status on devices/+/status topic
  ├── Idempotency check (already processed?)
  ├── Update message delivery_status in PostgreSQL
  ├── Update device pong timestamp
  ├── Record SIM health data
  └── Increment account usage counter

Step 8: Carrier Delivery Confirmation (optional)
  Android SMSDeliveryReceiver receives SMS_DELIVERED broadcast
  → Publishes DELIVERED status via MQTT
  → Backend updates delivery_status to PROBABLE_DELIVERED

Step 9: Webhook Dispatch (async)
  Backend → POST to registered webhook URLs
  Payload: {
    "event": "message.delivered",
    "message_id": "msg-uuid",
    "recipient": "+1234567890",
    "delivery_status": "PROBABLE_DELIVERED",
    "confidence_score": 0.95,
    "timestamp": "2026-07-04T12:00:00Z"
  }
  HMAC-SHA256 signature in X-Signature header
```

### 5.2 Message Priority & Queue Lanes

| Lane | Priority | Max Age | Use Case |
|------|----------|---------|----------|
| OTP | Highest | 90 seconds | One-time passwords |
| Transactional | Normal | 15 minutes | Order confirmations, alerts |
| Marketing | Lowest | 15 minutes | Promotional messages |

The worker processes OTP messages first, then transactional, then marketing, with an anti-starvation ratio to prevent marketing messages from never being sent.

### 5.3 Routing Strategy

The routing selector picks the best device for each message based on:

1. **SIM Health Status** — Blocked devices are excluded
2. **Circuit Breaker State** — Devices with open circuit breakers are excluded
3. **Carrier Reliability** — Devices on reliable carriers are preferred
4. **Country Match** — Devices whose carrier matches the recipient's country
5. **Cost Optimization** — Lower cost carriers preferred (configurable)
6. **Reliability Score** — Composite score from delivery reports + uptime

### 5.4 Fraud Detection

The fraud detector analyzes each message before sending:

| Check | Threshold | Action |
|-------|-----------|--------|
| Message volume spike | > 10x normal rate | Flag + block |
| Suspicious recipient patterns | Bulk same number | Flag |
| High failure rate | > 50% recent failures | Flag |
| Account risk score | > 0.7 | Flag + review |

### 5.5 Circuit Breakers

Three levels of circuit breakers prevent cascade failures:

| Scope | Threshold | Cooldown | Half-Open Successes |
|-------|-----------|----------|-------------------|
| Device | 50% failure rate in 5min | 2 minutes | 3 |
| Account | Device threshold × 2.0 | 5 minutes | — |
| Carrier | 30% failure rate in 5min | 10 minutes | — |

States: `CLOSED` (normal) → `OPEN` (blocked) → `HALF_OPEN` (testing) → `CLOSED`

---

## 6. Phase 5: Delivery Tracking & Status Reporting

### 6.1 Delivery Status Values

| Status | Meaning | Source |
|--------|---------|--------|
| `SENT` | Message sent to carrier | Android SmsManager callback |
| `CARRIER_ACCEPTED` | Carrier confirmed receipt | Carrier API (if available) |
| `PROBABLE_DELIVERED` | Carrier delivery report received | Android SMS_DELIVERED broadcast |
| `FAILED` | Send failed | Android SmsManager error callback |

### 6.2 Confidence Score

Each message gets a confidence score (0.0 - 1.0) based on:

- **Delivery report weight** (50%) — Did the carrier confirm delivery?
- **Historical pattern weight** (30%) — Has this device/carrier been reliable?
- **Carrier reliability weight** (20%) — How reliable is this carrier overall?

### 6.3 Device Health Monitoring

| Metric | Healthy | Degraded | Blocked |
|--------|---------|----------|---------|
| Success rate (24h) | > 60% | 30-60% | < 30% |
| Health trend slope | > -0.05 | -0.05 to -0.15 | < -0.15 |
| Uptime ratio (24h) | > 80% | 50-80% | < 50% |

---

## 7. Phase 6: Admin Dashboard & Monitoring

### 7.1 Dashboard Pages

| Route | Page | Backend Endpoint | Data |
|-------|------|-----------------|------|
| `/dashboard` | Overview | `GET /admin/stats` | Total accounts, devices, messages, queue depth |
| `/accounts` | Account Management | `GET /admin/accounts` | Paginated account list with search/filter |
| `/users` | User Management | `GET /admin/users` | Staff/admin accounts CRUD |
| `/analytics` | Message Analytics | `GET /admin/analytics` | Daily sent/delivered/failed breakdown |
| `/bi` | BI Dashboard | `GET /admin/bi` | Revenue, growth, fleet overview |
| `/webhooks` | Webhook Management | `GET /admin/webhooks` | Webhook CRUD + secret rotation |
| `/templates` | Template Management | `GET /admin/templates` | SMS templates with approval workflow |
| `/circuit-breakers` | Circuit Breakers | `GET /admin/circuit-breakers` | CB state viewer + manual reset |
| `/dead-letters` | Dead Letters | `GET /admin/dead-letters` | Failed messages + retry |
| `/fraud-flags` | Fraud Flags | `GET /admin/fraud-flags` | Detected fraud events + review |
| `/plans` | Plan Management | `GET /plans` | Billing plans CRUD |
| `/billing-settings` | Billing Settings | `GET /admin/payment-configs` | Payment method configuration |
| `/admin/subscriptions` | Subscription Requests | `GET /admin/subscription-requests` | Member upgrade requests |
| `/kyc-reviews` | KYC Reviews | `GET /admin/kyc` | Identity verification requests |
| `/feature-catalog` | Feature Catalog | `GET /feature-catalog` | Public feature list |

### 7.2 Admin API Endpoints

All admin endpoints use `AdminAuth` middleware which:
1. Validates JWT token
2. Checks `role == "admin"` in the token payload
3. Returns 403 if not admin

---

## 8. Phase 7: Member Portal

### 8.1 Member Pages

| Route | Page | Backend Endpoint | Data |
|-------|------|-----------------|------|
| `/member` | Dashboard | `GET /member/dashboard` | Account overview, device count, message stats |
| `/member/devices` | Devices | `GET /member/devices` | Device list, rename, disconnect |
| `/member/messages` | Messages | `GET /member/messages` | Paginated message history |
| `/member/analytics` | Analytics | `GET /member/analytics` | Daily analytics for this account |
| `/member/templates` | Templates | `GET /member/templates` | SMS templates CRUD |
| `/member/webhooks` | Webhooks | `GET /member/webhooks` | Webhook CRUD + secret rotation |
| `/member/upgrade` | Upgrade | `GET /plans` + `POST /member/subscription-requests` | Plan selection + upgrade request |
| `/billing` | Billing | `GET /plans` | Current plan + usage |
| `/settings` | Settings | `GET /auth/profile` | Profile, 2FA, sessions, API keys, preferences, KYC |

### 8.2 Member API Scoping

All member endpoints use `JWTAuth` middleware and automatically scope queries to the authenticated user's account. A member can never see data from other accounts.

---

## 9. Phase 8: Webhooks & Integrations

### 9.1 Webhook Configuration

Admins and members can register webhooks for events:

| Event | When | Payload |
|-------|------|---------|
| `message.delivered` | SMS delivery confirmed | message_id, recipient, delivery_status, confidence_score |

### 9.2 Webhook Security

- Each webhook has a unique secret (rotatable)
- Payload is signed with HMAC-SHA256
- Signature sent in `X-Signature` header
- Receiver should verify: `HMAC-SHA256(secret, payload) == X-Signature`

### 9.3 Webhook Delivery

- Max 5 attempts with exponential backoff (1min → 30min)
- 24-hour retry window
- 10-second delivery timeout per attempt
- Failed deliveries logged in dead letter queue

---

## 10. Phase 9: Billing & Subscriptions

### 10.1 Plan Structure

| Field | Description |
|-------|-------------|
| `daily_quota` | Max messages per day |
| `monthly_quota` | Max messages per month |
| `max_devices` | Max connected devices |
| `price_per_sms` | Cost per message |
| `monthly_price` | Fixed monthly fee |
| `routing_strategy` | Default routing strategy |
| `visibility` | public, private, or custom |

### 10.2 Subscription Flow

```
1. Member visits /member/upgrade
2. Fetches available plans from GET /plans
3. Selects a plan → POST /member/subscription-requests
4. Admin reviews at /admin/subscriptions
5. Admin approves → subscription updated
6. Member's quotas and device limits are adjusted
```

### 10.3 Payment Flow

```
1. Member creates payment request → POST /member/payment-requests
2. Admin reviews at admin payment-requests endpoint
3. Admin approves → payment recorded
4. Subscription renewed/activated
```

---

## 11. Phase 10: Security & Hardening

### 11.1 OWASP Top 10 Coverage

| OWASP | Implementation |
|-------|----------------|
| A01 Broken Access Control | JWT + API Key + AdminAuth middleware, per-device MQTT ACL |
| A02 Cryptographic Failures | MQTT credentials encrypted with AES-256-GCM, bcrypt passwords |
| A03 Injection | Parameterized pgx queries, no raw SQL interpolation |
| A04 Insecure Design | Per-device MQTT ACL isolation, fraud detection, circuit breakers |
| A05 Security Misconfiguration | Security headers, panic recovery, CORS config, production secret validation |
| A07 Auth Failures | Brute force protection, 2FA (TOTP), session management |
| A09 Logging | Structured slog logging, no secrets in logs, activity audit trail |

### 11.2 Security Middleware Chain

```
Request →
  ResponseCompression (gzip) →
    RecoverPanic (OWASP A05) →
      SecurityHeaders (OWASP A05) →
        RequestID (correlation) →
          ExtractClientIP (proxy-aware) →
            MaxBodySize (1 MB) →
              CORS (env-configurable) →
                Metrics (Prometheus) →
                  Router
```

### 11.3 Production Secret Validation

At startup, the backend rejects insecure defaults:
- `JWT_SECRET` must not be `change-me-in-production`
- `ENCRYPTION_MASTER_KEY` must not be empty or default
- Only enforced when `APP_ENV=production` or `APP_ENV=staging`

### 11.4 Per-API-Key Rate Limiting

- Redis fixed-window counter on `POST /api/v1/send`
- Configurable via `RATE_LIMIT_API_KEY_PER_MIN` (default: 60)
- Sets `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` headers
- Fail-open design (allows requests if Redis is down)

---

## 12. Frontend ↔ Backend Communication

### 12.1 API Client Setup

```typescript
// frontend/src/services/api.ts
const api = axios.create({
  baseURL: '/api/v1',           // Proxied by Vite dev server
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})
```

**Vite proxy** (development only):
```typescript
// frontend/vite.config.ts
server: {
  proxy: {
    '/api': { target: 'http://192.168.18.13:8080', changeOrigin: true }
  }
}
```

### 12.2 Request/Response Flow

```
1. Frontend function called (e.g., getDashboardStats())
2. api.get('/admin/stats')
3. Axios interceptor adds Authorization header from sessionStorage
4. Request hits Vite proxy → forwarded to backend:8080
5. Backend middleware chain processes request
6. Handler executes business logic
7. Response: { success: true, data: {...} }
8. Axios response interceptor handles 401 → auto-refresh token
9. Frontend receives typed response
```

### 12.3 Error Handling

```typescript
// 401 → Auto-refresh token, retry request
// 403 → Redirect to login
// 429 → Show rate limit message with Retry-After
// 500 → Show error toast
```

### 12.4 State Management

| Store | Purpose | Persistence |
|-------|---------|-------------|
| `authStore` (Zustand) | User auth state, 2FA flow | `sessionStorage` |
| `filterStore` (Zustand) | Table filter state | In-memory |
| `uiStore` (Zustand) | Sidebar state, theme | In-memory |

### 12.5 Data Fetching

All pages use TanStack Query for server state:

```typescript
// Example from MemberDashboardPage.tsx
const { data, isLoading } = useQuery({
  queryKey: ['member-dashboard'],
  queryFn: async () => {
    const res = await api.get<ApiResponse<MemberDashboard>>('/member/dashboard')
    return res.data.data!
  },
})
```

Mutations use `useMutation` with `queryClient.invalidateQueries()` for cache invalidation.

### 12.6 Frontend Service Functions

All API calls are organized in two service files:

**`frontend/src/services/auth.ts`** — Authentication, profile, sessions, API keys:
- `login()`, `register()`, `logout()`, `refreshToken()`
- `getProfile()`, `updateProfile()`, `changePassword()`
- `verify2FALogin()`, `getSessions()`, `revokeSession()`
- `listApiKeys()`, `createApiKey()`, `revokeApiKey()`

**`frontend/src/services/dashboard.ts`** — All admin + member endpoints:
- Admin: `getDashboardStats()`, `getAccounts()`, `getAnalytics()`, etc.
- Member: `/member/*` endpoints called directly via `api.get()`
- Billing: `getPlans()`, `createPlan()`, `getSubscriptionRequests()`, etc.

---

## 13. Android ↔ Backend Communication

### 13.1 HTTP Client Stack

| Component | Technology | Configuration |
|-----------|-----------|---------------|
| HTTP Client | OkHttp 4.12 | 30s timeout, retry interceptor |
| Serialization | Gson | `@SerializedName` annotations |
| Auth | `AuthInterceptor` | JWT from TokenManager, auto-refresh on 401 |
| Base URL | `BuildConfig.BASE_URL` | Debug: local IP, Release: production domain |

### 13.2 Retrofit API Interface

```kotlin
interface TextBeeApi {
    @POST("devices/login")
    suspend fun deviceLogin(@Body request: DeviceLoginRequest): Response<ApiResponse<DeviceLoginResponse>>

    @POST("devices/register")
    suspend fun registerDevice(@Body request: RegisterRequest): Response<ApiResponse<RegisterResponse>>

    @POST("devices/status")
    suspend fun updateStatus(@Body request: StatusUpdateRequest): Response<ApiResponse<Unit>>

    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: TokenRefreshRequest): Response<ApiResponse<TokenRefreshResponse>>

    @POST("devices/deregister")
    suspend fun deregisterDevice(@Body request: DeregisterRequest): Response<ApiResponse<Map<String, Any>>>
}
```

### 13.3 Data Models (Android → Backend)

```kotlin
data class DeviceLoginRequest(
    val email: String,
    val password: String,
    val device_id: String,      // Android ID
    val sim_slot: Int            // 1-based
)

data class StatusUpdateRequest(
    val message_id: String,
    val device_id: String,
    val status: String,          // "SENT" | "FAILED" | "DELIVERED"
    val delivery_status: String,
    val confidence_score: Double,
    val error: String?,
    val sim_slot: Int,
    val timestamp: Long
)
```

### 13.4 Data Models (Backend → Android)

```kotlin
data class DeviceLoginResponse(
    val device_id: String,
    val is_new_device: Boolean,
    val token: String,                    // JWT
    val mqtt: MqttConnectionInfo?,        // MQTT credentials
    val device: DeviceInfoData?,
    val account: AccountInfo?
)

data class MqttConnectionInfo(
    val broker_url: String,
    val username: String,                 // = deviceID
    val password: String,
    val credential_id: String
)
```

### 13.5 Token Management

The `TokenManager` (SharedPreferences wrapper) stores:

| Key | Value | Purpose |
|-----|-------|---------|
| `auth_token` | JWT string | HTTP API authentication |
| `refresh_token` | JWT string | Token refresh |
| `device_id` | String | Backend-assigned device ID |
| `mqtt_broker_url` | String | Mosquitto broker URL |
| `mqtt_username` | String | MQTT username (= deviceID) |
| `mqtt_password` | String | MQTT password |
| `mqtt_credential_id` | String | Credential record ID |
| `account_email` | String | Login email |
| `account_password` | String | Login password (for re-login) |
| `sim_slot` | Int | Selected SIM slot |
| `registered` | Boolean | Whether device is registered |

---

## 14. MQTT Protocol Deep Dive

### 14.1 Topic Structure

```
devices/{deviceID}/commands    Backend → Device    SMS command payload
devices/{deviceID}/status      Device → Backend   Delivery status report
devices/{deviceID}/ping        Device → Backend   Heartbeat (every 30s)
devices/{deviceID}/pong        Backend → Device   Pong response
devices/{deviceID}/ack         Device → Backend   Acknowledge pong
backend/status                 Backend → All      Backend online/offline (LWT)
```

### 14.2 Message Formats

**SMS Command** (Backend → Device):
```json
{
  "id": "msg-uuid-123",
  "account_id": "acct-uuid-456",
  "recipient": "+1234567890",
  "message": "Your verification code is 847291",
  "sender": "AeroXe",
  "priority": "HIGH",
  "sim_slot": 0,
  "timestamp": 1720000000000
}
```

**Status Report** (Device → Backend):
```json
{
  "message_id": "msg-uuid-123",
  "device_id": "ABC123-sim1",
  "status": "SENT",
  "delivery_status": "SENT",
  "confidence_score": 1.0,
  "error": null,
  "sim_slot": 0,
  "timestamp": 1720000001000
}
```

**Ping** (Device → Backend):
```json
{
  "device_id": "ABC123-sim1",
  "action": "ping",
  "timestamp": 1720000030000
}
```

**Pong** (Backend → Device):
```json
{
  "device_id": "ABC123-sim1",
  "action": "pong",
  "timestamp": 1720000030500
}
```

**ACK** (Device → Backend):
```json
{
  "device_id": "ABC123-sim1",
  "action": "ack",
  "timestamp": 1720000031000
}
```

### 14.3 QoS Levels

| Level | Used For | Guarantee |
|-------|----------|-----------|
| QoS 0 | Backend status (LWT) | At most once |
| QoS 1 | Default for backend | At least once |
| QoS 2 | All Android MQTT operations | Exactly once |

### 14.4 Connection Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `cleanSession` | `false` | Persist subscriptions across reconnects |
| `keepAlive` | 60 seconds | Connection keepalive interval |
| `connectionTimeout` | 30 seconds | Connection timeout |
| `autoReconnect` | `false` | Manual reconnect with exponential backoff |

---

## 15. Starting & Stopping Servers

### 15.1 With Docker Compose (Recommended)

This starts all 4 services (PostgreSQL, Redis, Mosquitto, Backend) with one command:

```bash
# Start everything (first time — builds images)
docker compose up --build -d

# Start everything (subsequent — uses cached images)
docker compose up -d

# Check status
docker compose ps

# View logs (all services)
docker compose logs -f

# View logs (specific service)
docker compose logs -f backend
docker compose logs -f mosquitto

# Stop all services (keeps data)
docker compose down

# Stop all services AND delete all data (clean slate)
docker compose down -v

# Rebuild from scratch (clean slate + rebuild images)
docker compose down -v && docker compose up --build -d
```

### 15.2 Without Docker (Manual Setup)

#### Prerequisites

- Go 1.22+ installed
- PostgreSQL 18 running on localhost:5432
- Redis 7 running on localhost:6379
- Mosquitto 2.x running on localhost:1883
- Node.js 20+ installed

#### Step 1: Set Up PostgreSQL

```bash
# Create database
psql -U postgres -c "CREATE USER textbee WITH PASSWORD 'textbee';"
psql -U postgres -c "CREATE DATABASE textbee OWNER textbee;"

# Run migrations
cd backend
psql -U textbee -d textbee -f migrations/001_init.sql
psql -U textbee -d textbee -f migrations/002_add_users_table.sql
psql -U textbee -d textbee -f migrations/003_add_2fa_and_preferences.sql
psql -U textbee -d textbee -f migrations/003_add_device_name.sql
psql -U textbee -d textbee -f migrations/004_add_mqtt_encrypted_password.sql
psql -U textbee -d textbee -f migrations/004_payment_configs_and_subscription_requests.sql
psql -U textbee -d textbee -f migrations/005_add_mqtt_auth_index.sql
psql -U textbee -d textbee -f migrations/006_plan_visibility.sql
```

#### Step 2: Set Up Redis

```bash
# Start Redis (no special config needed for development)
redis-server
```

#### Step 3: Set Up Mosquitto

```bash
# Create config directory
mkdir -p /tmp/mosquitto/{config,data,auth}

# Create password file
mosquitto_passwd -c /tmp/mosquitto/auth/password.txt backend
# Enter password when prompted

# Copy ACL
cp backend/mosquitto/acl /tmp/mosquitto/auth/acl

# Create config
cat > /tmp/mosquitto/config/mosquitto.conf << 'EOF'
listener 1883
allow_anonymous false
password_file /tmp/mosquitto/auth/password.txt
acl_file /tmp/mosquitto/auth/acl
persistence true
persistence_location /tmp/mosquitto/data/
log_dest stdout
max_connections 100
max_inflight_messages 20
max_queued_messages 1000
EOF

# Start Mosquitto
mosquitto -c /tmp/mosquitto/config/mosquitto.conf -d
```

#### Step 4: Configure Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your database/Redis/MQTT credentials
# Key variables to set:
#   DB_HOST=localhost
#   REDIS_HOST=localhost
#   MQTT_BROKER=localhost
#   MQTT_USERNAME=backend
#   MQTT_PASSWORD=<password from step 3>
#   JWT_SECRET=<your-secret>
#   APP_ENV=development
```

#### Step 5: Start Backend

```bash
cd backend

# Option A: Using Makefile
make build    # Compiles to ./server binary
make run      # Runs the binary
# or
make run-build  # Build + run in one step

# Option B: Direct Go commands
go build -o server ./cmd/server
./server

# Option C: Go run (no binary)
go run ./cmd/server
```

The backend starts on `http://localhost:8080` (API) and `http://localhost:9090` (Prometheus metrics).

#### Step 6: Start Frontend

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
# or
npx vite --host 0.0.0.0
```

The frontend starts on `http://localhost:5173` and proxies `/api` requests to the backend.

#### Step 7: Stop Services (Manual)

```bash
# Stop backend (Ctrl+C if running in foreground)
# If running as background process:
pkill -f "server"  # or whatever the binary name is

# Stop frontend (Ctrl+C)
# Stop Redis
redis-cli shutdown

# Stop Mosquitto
mosquitto_ctrl shutdown
# or
pkill -f mosquitto

# Stop PostgreSQL (depends on your setup)
# systemctl stop postgresql  (Linux)
# brew services stop postgresql  (macOS)
```

### 15.3 Frontend Commands

```bash
cd frontend

npm run dev          # Start dev server (port 5173)
npm run dev:clean    # Clear Vite cache + start dev server
npm run build        # Production build (TypeScript check + Vite build)
npm run lint         # Run oxlint
npm run preview      # Preview production build locally
```

### 15.4 Backend Commands

```bash
cd backend

make build           # Compile Go binary
make run             # Run compiled binary
make run-build       # Build + run

go build ./...       # Check compilation (no output = success)
go vet ./...         # Static analysis
go test ./...        # Run tests
```

### 15.5 Quick Reference

| Action | Docker | Manual |
|--------|--------|--------|
| Start all | `docker compose up -d` | Start PostgreSQL, Redis, Mosquitto, then `cd backend && make run-build` + `cd frontend && npm run dev` |
| Stop all | `docker compose down` | Ctrl+C or `pkill` each process |
| Reset data | `docker compose down -v` | Drop PostgreSQL DB + delete Redis/Mosquitto data dirs |
| View logs | `docker compose logs -f` | Check terminal output of each process |
| Rebuild | `docker compose up --build -d` | `cd backend && make build` + `cd frontend && npm run build` |

---

## 16. Environment Variables Reference

### Server
| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_HOST` | `0.0.0.0` | Bind address |
| `SERVER_PORT` | `8080` | API server port |
| `SERVER_READ_TIMEOUT` | `30s` | HTTP read timeout |
| `SERVER_WRITE_TIMEOUT` | `30s` | HTTP write timeout |
| `SERVER_SHUTDOWN_TIMEOUT` | `10s` | Graceful shutdown timeout |

### Database
| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `textbee` | Database user |
| `DB_PASSWORD` | `textbee` | Database password |
| `DB_NAME` | `textbee` | Database name |
| `DB_SSLMODE` | `disable` | SSL mode |
| `DB_MAX_OPEN_CONNS` | `25` | Connection pool max open |
| `DB_MAX_IDLE_CONNS` | `10` | Connection pool max idle |
| `DB_CONN_MAX_LIFETIME` | `5m` | Connection max lifetime |

### Redis
| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | (empty) | Redis password |
| `REDIS_DB` | `0` | Redis database number |

### MQTT
| Variable | Default | Description |
|----------|---------|-------------|
| `MQTT_BROKER` | `localhost` | Mosquitto host |
| `MQTT_PORT` | `1883` | Mosquitto port |
| `MQTT_USERNAME` | (empty) | Backend MQTT username |
| `MQTT_PASSWORD` | (empty) | Backend MQTT password |
| `MQTT_CA_CERT` | (empty) | CA certificate path |
| `MQTT_CLIENT_ID` | `textbee-backend` | MQTT client ID |
| `MQTT_QOS` | `1` | Default QoS level |
| `MQTT_USE_TLS` | `false` | Enable TLS |
| `MQTT_TLS_INSECURE` | `false` | Skip TLS verification |

### JWT
| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `change-me-in-production` | JWT signing secret |
| `JWT_ACCESS_TTL` | `15m` | Access token TTL |
| `JWT_REFRESH_TTL` | `168h` | Refresh token TTL |
| `JWT_ISSUER` | `textbee` | JWT issuer claim |

### Encryption
| Variable | Default | Description |
|----------|---------|-------------|
| `ENCRYPTION_MASTER_KEY` | (empty) | AES-256-GCM key for MQTT credential encryption |

### Queue
| Variable | Default | Description |
|----------|---------|-------------|
| `QUEUE_OTP_STREAM` | `otp_queue` | Redis Stream for OTP messages |
| `QUEUE_TRANSACTIONAL_STREAM` | `transactional_queue` | Redis Stream for transactional messages |
| `QUEUE_MARKETING_STREAM` | `marketing_queue` | Redis Stream for marketing messages |
| `QUEUE_DEAD_LETTER_STREAM` | `dead_letter_queue` | Redis Stream for failed messages |
| `QUEUE_WORKER_COUNT` | `3` | Number of concurrent workers |
| `QUEUE_MAX_DELIVERY_ATTEMPTS` | `3` | Max retry attempts per message |

### Rate Limiting
| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_DEVICE_PER_MIN` | `10` | Max messages per device per minute |
| `RATE_LIMIT_DEVICE_PER_HOUR` | `100` | Max messages per device per hour |
| `RATE_LIMIT_API_KEY_PER_MIN` | `60` | Max API calls per API key per minute |

### App
| Variable | Default | Description |
|----------|---------|-------------|
| `APP_ENV` | `development` | Environment (development/staging/production) |
| `ADMIN_EMAIL` | `admin@aeroxe.com` | Default admin email |
| `ADMIN_PASSWORD` | (empty) | Default admin password (auto-generated if empty) |
| `CORS_ALLOWED_ORIGINS` | localhost:5173,localhost:3000 | Allowed CORS origins |

---

*Last updated: July 4, 2026*
*Aeroxe Enterprises Pvt. Ltd., Jalgaon, Maharashtra, India*
