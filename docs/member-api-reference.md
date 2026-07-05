# AeroXe Bee — Member API Integration Guide

> Complete reference for all member-facing REST API endpoints.
> Base URL: `https://api.aeroxe.com/api/v1`
> Copyright © Aeroxe Enterprises Pvt. Ltd., Jalgaon, Maharashtra, India

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Account & Profile](#2-account--profile)
3. [API Keys](#3-api-keys)
4. [Sending SMS Messages](#4-sending-sms-messages)
5. [OTP System](#5-otp-system)
6. [Message History](#6-message-history)
7. [Devices](#7-devices)
8. [Dashboard & Analytics](#8-dashboard--analytics)
9. [Templates](#9-templates)
10. [Webhooks](#10-webhooks)
11. [Subscription & Billing](#11-subscription--billing)
12. [Notifications & Preferences](#12-notifications--preferences)
13. [Security (2FA)](#13-security-2fa)
14. [Sessions](#14-sessions)
15. [KYC Verification](#15-kyc-verification)
16. [Payment Requests](#16-payment-requests)
17. [Subscription Requests](#17-subscription-requests)
18. [Error Codes](#18-error-codes)
19. [Rate Limits](#19-rate-limits)

---

## 1. Authentication

Two authentication methods are available:

| Method | Use Case | Header |
|--------|----------|--------|
| **JWT Bearer Token** | Member portal (dashboard, settings, templates) | `Authorization: Bearer <token>` |
| **API Key** | Programmatic access (send SMS, OTP, list messages) | `Authorization: Bearer <api_key>` |

### POST /auth/register

Create a new member account.

```bash
curl -X POST https://api.aeroxe.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecureP@ss1"
  }'
```

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | Non-empty |
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Min 8 chars, uppercase, lowercase, digit, special char |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "member"
    }
  }
}
```

### POST /auth/login

Login with email and password. Returns a temporary 2FA token if two-factor auth is enabled.

```bash
curl -X POST https://api.aeroxe.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "password": "SecureP@ss1"}'
```

**Response (200) — No 2FA:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "member"
    }
  }
}
```

**Response (200) — 2FA Required:**
```json
{
  "success": true,
  "data": {
    "requires_2fa": true,
    "two_fa_pending": true,
    "two_fa_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "member"
    }
  }
}
```

### POST /auth/login/2fa

Complete 2FA verification using the temporary token from the login response.

```bash
curl -X POST https://api.aeroxe.com/api/v1/auth/login/2fa \
  -H "Content-Type: application/json" \
  -d '{"token": "<two_fa_token>", "code": "123456"}'
```

**Response (200):** Same as the non-2FA login response.

### POST /auth/refresh

Refresh an expired access token using the refresh token.

```bash
curl -X POST https://api.aeroxe.com/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJhbGciOiJIUzI1NiIs..."}'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

## 2. Account & Profile

All profile endpoints require JWT authentication.

### GET /auth/profile

```bash
curl https://api.aeroxe.com/api/v1/auth/profile \
  -H "Authorization: Bearer <token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "plan": "pro",
    "status": "active",
    "verified": true,
    "risk_score": 0.0,
    "created_at": "2026-01-15T10:30:00Z",
    "is_admin": false
  }
}
```

### PUT /auth/profile

Update your display name.

```bash
curl -X PUT https://api.aeroxe.com/api/v1/auth/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Doe"}'
```

### POST /auth/change-password

Change your account password.

```bash
curl -X POST https://api.aeroxe.com/api/v1/auth/change-password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "old_password": "SecureP@ss1",
    "new_password": "NewSecureP@ss2"
  }'
```

---

## 3. API Keys

API keys are used to authenticate programmatic access (SMS, OTP, messages). Scoped with granular permissions.

### GET /account/api-keys

List all API keys (active and revoked).

```bash
curl https://api.aeroxe.com/api/v1/account/api-keys \
  -H "Authorization: Bearer <token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "account_id": "uuid",
      "label": "Production server",
      "scopes": ["send", "read"],
      "expires_at": "2027-01-01T00:00:00Z",
      "revoked_at": null,
      "created_at": "2026-06-01T10:00:00Z",
      "request_count": 1542,
      "last_used_at": "2026-07-04T14:30:00Z"
    }
  ]
}
```

### POST /account/api-keys

Create a new API key. **The raw key is only shown once in the response.**

```bash
curl -X POST https://api.aeroxe.com/api/v1/account/api-keys \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "CI/CD pipeline",
    "scopes": ["send", "read"],
    "expires_in": "8760h"
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | string | Yes | Human-readable name for the key |
| `scopes` | string[] | Yes | Array of: `send`, `read`, `otp`, `webhook` |
| `expires_in` | string | No | Go duration: `24h`, `720h` (30d), `2160h` (90d), `8760h` (1y). Empty = never expires |

**Scopes Reference:**

| Scope | Permission |
|-------|-----------|
| `send` | `POST /api/v1/send` — Send SMS messages |
| `read` | `GET /api/v1/messages` — Read message history |
| `otp` | `POST /api/v1/otp/send`, `POST /api/v1/otp/verify` — OTP system |
| `webhook` | Webhook management endpoints |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "label": "CI/CD pipeline",
    "api_key": "ak_live_abc123xyz...",
    "scopes": ["send", "read"],
    "expires_at": "2027-06-04T00:00:00Z",
    "created_at": "2026-06-04T00:00:00Z"
  }
}
```

> ⚠️ **Save the `api_key` immediately** — it will not be shown again.

### DELETE /account/api-keys/{id}

Revoke an API key (cannot be undone).

```bash
curl -X DELETE https://api.aeroxe.com/api/v1/account/api-keys/{key_id} \
  -H "Authorization: Bearer <token>"
```

---

## 4. Sending SMS Messages

All SMS endpoints require API Key authentication (not JWT).

### POST /send

Send an SMS message.

```bash
curl -X POST https://api.aeroxe.com/api/v1/send \
  -H "Authorization: Bearer <api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "+1234567890",
    "message": "Hello from AeroXe!",
    "message_type": "transactional",
    "idempotency_key": "unique-request-001"
  }'
```

**Request Body:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `recipient` | string | Yes | — | Phone number in E.164 format (`+1234567890`) |
| `sender` | string | No | `AeroXe Bee` | Sender ID / name |
| `message` | string | Yes | — | SMS body text |
| `message_type` | string | No | `transactional` | `otp`, `transactional`, or `marketing` |
| `idempotency_key` | string | Yes | — | Unique key to prevent duplicate sends |
| `template_id` | string | No | — | UUID of an approved template to use |
| `routing_strategy` | string | No | auto | `fastest_delivery`, `lowest_cost`, `highest_reliability`, `geo_affinity` |

**Routing Strategy Defaults:**
- `otp` → `highest_reliability`
- `transactional` → `highest_reliability`
- `marketing` → `lowest_cost`

**Response (202):**
```json
{
  "success": true,
  "data": {
    "message_id": "uuid",
    "status": "queued",
    "queue": "transactional",
    "idempotency_key": "unique-request-001",
    "created_at": "2026-07-04T14:30:00Z",
    "latency_ms": 12
  }
}
```

**Duplicate (200):**
```json
{
  "success": true,
  "data": {
    "message_id": "uuid",
    "status": "duplicate"
  }
}
```

**Quota Exceeded (429):**
```json
{"error": "quota exceeded"}
```

---

## 5. OTP System

### POST /otp/send

Generate and queue a one-time password.

```bash
curl -X POST https://api.aeroxe.com/api/v1/otp/send \
  -H "Authorization: Bearer <api_key>" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message_id": "uuid",
    "expires_in": 300
  }
}
```

**OTP Behavior:**
- Default length: 6 digits
- TTL: 5 minutes
- Max verification attempts: 5
- Lockout: 15 minutes after 5 failures
- Stored as HMAC-SHA256 hash (never plaintext)

### POST /otp/verify

Verify an OTP code.

```bash
curl -X POST https://api.aeroxe.com/api/v1/otp/verify \
  -H "Authorization: Bearer <api_key>" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890", "code": "123456"}'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "message": "OTP verified successfully"
  }
}
```

**Error Responses:**
- `404` — OTP expired or not found
- `401` — Invalid OTP code
- `429` — Too many failed attempts (account locked for 15 minutes)

---

## 6. Message History

### GET /messages

List recent messages (API Key auth, max 50 returned).

```bash
curl https://api.aeroxe.com/api/v1/messages \
  -H "Authorization: Bearer <api_key>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "recipient": "+1234567890",
      "sender": "AeroXe Bee",
      "message_type": "transactional",
      "status": "delivered",
      "delivery_status": "PROBABLE_DELIVERED",
      "confidence_score": 0.92,
      "created_at": "2026-07-04T14:30:00Z"
    }
  ]
}
```

### GET /messages/{id}

Get full details for a single message (including decrypted content).

```bash
curl https://api.aeroxe.com/api/v1/messages/{message_id} \
  -H "Authorization: Bearer <api_key>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "recipient": "+1234567890",
    "sender": "AeroXe Bee",
    "message": "Hello from AeroXe!",
    "message_type": "transactional",
    "status": "delivered",
    "delivery_status": "PROBABLE_DELIVERED",
    "confidence_score": 0.92,
    "error_reason": null,
    "routing_strategy": "highest_reliability",
    "created_at": "2026-07-04T14:30:00Z",
    "delivered_at": "2026-07-04T14:30:05Z"
  }
}
```

### GET /messages/{id}/confidence

Get delivery confidence score breakdown for a message.

```bash
curl https://api.aeroxe.com/api/v1/messages/{message_id}/confidence \
  -H "Authorization: Bearer <api_key>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message_id": "uuid",
    "delivery_status": "PROBABLE_DELIVERED",
    "confidence_score": 0.92,
    "routing_strategy": "highest_reliability"
  }
}
```

**Delivery Status Values:**

| Status | Meaning |
|--------|---------|
| `SENT` | Message enqueued, not yet delivered to device |
| `CARRIER_ACCEPTED` | Carrier confirmed receipt |
| `PROBABLE_DELIVERED` | High confidence delivery (confidence > 0.7) |
| `FAILED` | Delivery failed |

---

## 7. Devices

### GET /devices

List all devices registered to your account (API Key or JWT auth).

```bash
curl https://api.aeroxe.com/api/v1/devices \
  -H "Authorization: Bearer <token_or_api_key>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "ANDROID_ID_SIM0",
      "physical_device_id": "ANDROID_ID",
      "account_id": "uuid",
      "sim_slot": 0,
      "carrier": "AT&T",
      "status": "ONLINE",
      "sim_health_status": "HEALTHY",
      "last_seen": "2026-07-04T14:30:00Z",
      "messages_sent_count": 1542,
      "reliability_score": 0.95,
      "success_rate_24h": 0.98,
      "created_at": "2026-01-15T10:30:00Z"
    }
  ]
}
```

**Device Status Values:**

| Status | Meaning |
|--------|---------|
| `ONLINE` | Device is connected and ready to send |
| `OFFLINE` | Device is disconnected |

**SIM Health Status Values:**

| Status | Meaning |
|--------|---------|
| `HEALTHY` | Normal operation |
| `DEGRADED` | Reduced reliability, may fail more often |
| `BLOCKED` | Device is excluded from message routing |

### GET /devices/{id}

Get detailed info for a specific device.

### POST /devices/login

Authenticate the Android device and register MQTT credentials. Used by the Android app.

```bash
curl -X POST https://api.aeroxe.com/api/v1/devices/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecureP@ss1",
    "device_id": "ANDROID_DEVICE_ID",
    "sim_slot": 0,
    "carrier": "AT&T",
    "model": "Pixel 7",
    "os_version": "Android 14",
    "app_version": "1.0.0"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "mqtt": {
      "broker": "mqtt://broker.aeroxe.com:8883",
      "username": "ANDROID_DEVICE_ID",
      "password": "encrypted_mqtt_password"
    }
  }
}
```

---

## 8. Dashboard & Analytics

All dashboard endpoints require JWT authentication.

### GET /member/dashboard

Get consolidated dashboard data.

```bash
curl https://api.aeroxe.com/api/v1/member/dashboard \
  -H "Authorization: Bearer <token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "account": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "plan": "pro",
      "status": "active"
    },
    "devices": {
      "total": 5,
      "online": 3
    },
    "messages": {
      "total_sent": 1542,
      "total_delivered": 1480,
      "total_failed": 62,
      "delivery_rate": 95.98
    },
    "usage": {
      "daily": 142,
      "monthly": 4280
    },
    "subscription": {
      "plan_type": "pro",
      "billing_cycle": "monthly",
      "status": "active",
      "quota_daily": 1000,
      "quota_monthly": 30000,
      "renewal_date": "2026-08-15T00:00:00Z"
    }
  }
}
```

### GET /member/analytics

Get daily analytics for the last 30 days.

```bash
curl "https://api.aeroxe.com/api/v1/member/analytics" \
  -H "Authorization: Bearer <token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-07-04",
      "total": 142,
      "delivered": 136,
      "failed": 6,
      "otp": 45,
      "transactional": 80,
      "marketing": 17
    }
  ]
}
```

### GET /member/stats

Get real-time stats.

```bash
curl https://api.aeroxe.com/api/v1/member/stats \
  -H "Authorization: Bearer <token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "daily_usage": 142,
    "devices": 5,
    "online": 3,
    "plan": {
      "plan_type": "pro",
      "quota_daily": 1000,
      "quota_monthly": 30000
    }
  }
}
```

### GET /member/messages

Get paginated message history for your account.

```bash
curl "https://api.aeroxe.com/api/v1/member/messages?page=1&pageSize=20&status=delivered&type=otp" \
  -H "Authorization: Bearer <token>"
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `pageSize` | int | 20 | Items per page (max 100) |
| `status` | string | — | Filter: `pending`, `delivered`, `failed` |
| `type` | string | — | Filter: `otp`, `transactional`, `marketing` |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [...],
    "total": 1542,
    "page": 1,
    "page_size": 20,
    "total_pages": 78
  }
}
```

---

## 9. Templates

Templates are reusable message bodies with variable placeholders. All endpoints require JWT auth. Templates start with `pending` approval status.

### GET /member/templates

List all templates for your account.

### POST /member/templates

Create a new template.

```bash
curl -X POST https://api.aeroxe.com/api/v1/member/templates \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome SMS",
    "body": "Welcome {{name}}! Your code is {{code}}.",
    "variables": ["name", "code"]
  }'
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "account_id": "uuid",
    "name": "Welcome SMS",
    "body": "Welcome {{name}}! Your code is {{code}}.",
    "variables": ["name", "code"],
    "approval_status": "pending",
    "created_at": "2026-07-04T14:30:00Z"
  }
}
```

### GET /member/templates/{id}

### PUT /member/templates/{id}

Update a template (resets approval status to `pending`).

### DELETE /member/templates/{id}

Delete a template.

**Template Approval Status:**

| Status | Meaning |
|--------|---------|
| `pending` | Submitted, awaiting admin review |
| `approved` | Can be used with `template_id` in `/send` |
| `rejected` | Rejected by admin, cannot be used |

---

## 10. Webhooks

Receive HTTP callbacks when message events occur. All endpoints require JWT auth.

### GET /member/webhooks

List all webhooks for your account.

### POST /member/webhooks

Create a new webhook endpoint.

```bash
curl -X POST https://api.aeroxe.com/api/v1/member/webhooks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhooks/aeroxe",
    "events": ["message.delivered"]
  }'
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "url": "https://your-server.com/webhooks/aeroxe",
    "events": ["message.delivered"],
    "active": true,
    "secret": "64-char-hex-string"
  }
}
```

> ⚠️ **Save the `secret`** — it is used to verify webhook signatures via HMAC-SHA256.

**Webhook Payload (POST to your URL):**

```json
{
  "event": "message.delivered",
  "message_id": "uuid",
  "recipient": "+1234567890",
  "sender": "AeroXe Bee",
  "message_type": "transactional",
  "delivery_status": "PROBABLE_DELIVERED",
  "confidence_score": 0.92,
  "timestamp": "2026-07-04T14:30:05Z"
}
```

**Verification:** Check the `X-Signature` header — HMAC-SHA256 of the request body using your webhook secret.

### PUT /member/webhooks/{id}

Update a webhook's URL, events, or active status.

### DELETE /member/webhooks/{id}

Delete a webhook.

### POST /member/webhooks/{id}/rotate-secret

Generate a new webhook secret (old one is invalidated).

---

## 11. Subscription & Billing

### GET /account/subscription

Get your current subscription details.

```bash
curl https://api.aeroxe.com/api/v1/account/subscription \
  -H "Authorization: Bearer <token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "plan_type": "pro",
    "billing_cycle": "monthly",
    "status": "active",
    "quota_daily": 1000,
    "quota_monthly": 30000,
    "max_queue_depth": 5000,
    "renewal_date": "2026-08-15T00:00:00Z"
  }
}
```

### GET /account/usage

Get current daily and monthly usage.

```bash
curl https://api.aeroxe.com/api/v1/account/usage \
  -H "Authorization: Bearer <token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "daily": 142,
    "monthly": 4280
  }
}
```

### PUT /account/routing-strategy

Update the default routing strategy for your account.

```bash
curl -X PUT https://api.aeroxe.com/api/v1/account/routing-strategy \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"strategy": "lowest_cost"}'
```

---

## 12. Notifications & Preferences

### GET /member/preferences

### PUT /member/preferences

```bash
curl -X PUT https://api.aeroxe.com/api/v1/member/preferences \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email_notifications": true,
    "sms_notifications": false,
    "webhook_notifications": true,
    "billing_alerts": true,
    "security_alerts": true
  }'
```

---

## 13. Security (2FA)

### POST /auth/2fa/setup

Enable two-factor authentication. Returns a TOTP secret and QR code URL.

```bash
curl -X POST https://api.aeroxe.com/api/v1/auth/2fa/setup \
  -H "Authorization: Bearer <token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "url": "otpauth://totp/AeroXe:john@example.com?secret=JBSWY3DPEHPK3PXP&issuer=AeroXe"
  }
}
```

### POST /auth/2fa/verify

Verify a TOTP code to complete 2FA setup.

### GET /auth/2fa/status

Check if 2FA is enabled.

### POST /auth/2fa/disable

Disable 2FA (requires current TOTP code).

---

## 14. Sessions

### GET /auth/sessions

List all active login sessions.

```bash
curl https://api.aeroxe.com/api/v1/auth/sessions \
  -H "Authorization: Bearer <token>"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "user_type": "account",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0 ...",
      "last_active": "2026-07-04T14:30:00Z",
      "created_at": "2026-07-04T10:00:00Z"
    }
  ]
}
```

### DELETE /auth/sessions/{id}

Revoke a specific session.

### DELETE /auth/sessions

Revoke all other sessions (keep current).

---

## 15. KYC Verification

### POST /member/kyc

Submit identity verification documents.

```bash
curl -X POST https://api.aeroxe.com/api/v1/member/kyc \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "document_type": "passport",
    "document_number": "AB1234567",
    "document_url": "https://drive.google.com/..."
  }'
```

**Document Types:** `passport`, `drivers_license`, `national_id`

### GET /member/kyc

Get KYC verification status (`not_submitted`, `pending`, `verified`, `rejected`).

---

## 16. Payment Requests

### POST /member/payment-requests

Submit a payment/recharge request.

```bash
curl -X POST https://api.aeroxe.com/api/v1/member/payment-requests \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": "pro",
    "billing_cycle": "monthly",
    "payment_method": "bank_transfer",
    "amount": 29.99,
    "proof_url": "https://drive.google.com/..."
  }'
```

### GET /member/payment-requests

List your payment requests and their status.

---

## 17. Subscription Requests

### POST /member/subscription-requests

Request a plan upgrade or change.

```bash
curl -X POST https://api.aeroxe.com/api/v1/member/subscription-requests \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "requested_plan": "scale",
    "requested_billing_cycle": "monthly",
    "reason": "Need more SMS quota for growth"
  }'
```

### GET /member/subscription-requests

List your subscription requests and their approval status.

---

## 18. Error Codes

All errors follow a consistent format:

```json
{"error": "descriptive error message"}
```

| HTTP Status | Meaning |
|------------|---------|
| `400` | Bad request — invalid body, missing fields, validation error |
| `401` | Unauthorized — missing or invalid token/API key |
| `403` | Forbidden — valid token but insufficient permissions |
| `404` | Not found — resource does not exist or not owned by you |
| `409` | Conflict — duplicate email or idempotency key already used |
| `429` | Too many requests — rate limit or quota exceeded (check `Retry-After` header) |
| `500` | Internal server error |

**Rate Limit Headers (on 429):**

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Max attempts allowed in window |
| `X-RateLimit-Remaining` | Remaining attempts |
| `Retry-After` | Seconds to wait before retrying |

---

## 19. Rate Limits

| Scope | Limit | Window |
|-------|-------|--------|
| Login attempts (per IP) | 5 | 15 minutes |
| Login lockout (per IP) | — | 30 minutes |
| SMS send (per device) | 10 | 1 minute |
| SMS send (per device) | 100 | 1 hour |
| OTP attempts (per phone) | 5 | 5 minutes |

---

## Quick Start Example

```bash
# 1. Register
TOKEN=$(curl -s -X POST https://api.aeroxe.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"SecureP@ss1"}' \
  | jq -r '.data.token')

# 2. Create an API key
API_KEY=$(curl -s -X POST https://api.aeroxe.com/api/v1/account/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"CLI","scopes":["send","read"]}' \
  | jq -r '.data.api_key')

# 3. Send an SMS
curl -X POST https://api.aeroxe.com/api/v1/send \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "+1234567890",
    "message": "Hello from AeroXe!",
    "idempotency_key": "test-001"
  }'

# 4. Check delivery
curl https://api.aeroxe.com/api/v1/messages/{message_id} \
  -H "Authorization: Bearer $API_KEY"
```
