# Product Requirement Document (PRD)
## AeroXe Bee — Distributed Android SMS Gateway Platform

**Document Version:** 1.0 (Complete, Final)
**Date:** July 2026
**Status:** Approved for Engineering Handoff

---

## Table of Contents
1. Vision & Objective
2. Core Design Principles
3. Key Product Decisions
4. System Architecture
5. Component Breakdown
6. Security Architecture
7. MQTT Design & Broker High Availability
8. Android App Specification
9. Ping–Pong Liveness System
10. Queue, Priority & Backpressure
11. Device Selection — Weighted Scoring & Reputation
12. Idempotency & Deduplication
13. Carrier-Aware & Global Rate Control
14. SIM Health & Predictive Ban Detection
15. Delivery Confidence Model
16. Routing Strategy Layer
17. Circuit Breaker System
18. OTP System
19. Fraud & Abuse Detection
20. Multi-Tenant Isolation
21. Cost Tracking & Profit-Optimized Routing
22. Database Design
23. Full API Specification
24. Admin Dashboard
25. Plans & Billing
26. Non-Functional Requirements
27. Failure Handling & Retry Strategy
28. Observability
29. Disaster Recovery
30. Testing Strategy
31. Deployment & Infrastructure
32. Legal & Compliance
33. Success Metrics
34. Future Enhancements

---

## 1. Vision & Objective

Build a secure, scalable, telecom-grade SMS routing platform that uses Android devices with real SIM cards as distributed SMS-sending and -receiving nodes. The platform delivers OTPs and transactional/marketing SMS at a fraction of the cost of carrier-grade aggregators by routing traffic through a managed fleet of phones instead of paying per-message aggregator fees.

The system is asynchronous by design; treats "sent" and "delivered" as genuinely different states rather than assuming Android's delivery reports are reliable; actively monitors and predicts SIM health degradation; protects SIMs from bans through rate control, reputation-aware routing, and automatic circuit breaking; guarantees no duplicate sends; and gives full financial visibility, including the ability to route for profitability, not just reliability.

The platform ships as both a managed SaaS product and an open-source, self-hostable core, from the same codebase.

## 2. Core Design Principles

- **API-first, headless backend.**
- **Asynchronous by default,** with priority-aware processing so a time-sensitive OTP never waits behind bulk marketing traffic.
- **Zero-trust security** — every device and API caller authenticates independently.
- **Event-driven, highly-available device communication** via clustered MQTT.
- **Strong consistency** for OTP validation and message deduplication.
- **Encrypted persistence** for all message content, OTP values, and PII.
- **Skeptical about delivery truth** — Android's SMS delivery signals are not fully trustworthy, so the platform models delivery as a confidence score, not a binary fact.
- **Continuous and predictive health monitoring** — the platform assumes SIMs will degrade, and tries to catch the trend before it becomes a ban, not just react after it happens.
- **Self-protecting** — automatic circuit breakers contain failure spikes at the device, account, and carrier level without waiting for a human to notice.
- **Blast-radius containment** — one account's risky behavior must not degrade service for others.
- **Full operational and financial visibility**, including the option to route for cost/profit outcomes, not only reliability.

---

## 3. Key Product Decisions

| Decision Area | Final Decision |
|---|---|
| Message/OTP retention | Message bodies: 90 days, then purged. OTP audit metadata (never the OTP value): 1 year. Configurable per account, 30-day floor. |
| Overage handling | 10% grace buffer above quota, then blocked until next cycle or manual upgrade. Notified at 80/100/110%. |
| MQTT broker | Mosquitto by default; migrates to a clustered, multi-node EMQX deployment at 500 concurrent devices or 50 msg/sec sustained. |
| Deployment model | Both self-hosted (Docker Compose) and managed SaaS (Kubernetes), from the same open-source core. |
| Multi-SIM support | Each SIM slot is an independent logical device identity, rate-limited and scored independently. |
| Dispatch model | Asynchronous queue with priority lanes (OTP > transactional > marketing). |
| Device selection method | Weighted reliability score plus a separate carrier-reputation score (which now also incorporates fraud-flag history — see §11.2), selectable via routing strategy (§16). |
| Duplicate-send prevention | Mandatory idempotency key on every send request. |
| SIM health | Actively and predictively monitored; devices automatically demoted or removed on detected or trending degradation. |
| Tenant isolation | Device pools isolable per account (opt-in, plan-dependent); every account carries a risk score. |
| Delivery truth | Modeled as a confidence score across multiple signal sources, not a single binary delivered/failed flag. |
| Score design | Exactly two device-level scores — reliability (connectivity/performance) and reputation (carrier perception, including fraud history) — deliberately not a third overlapping "trust" score, to avoid metric sprawl that drifts out of sync. |
| Resilience | Automatic circuit breakers at device, account, and carrier level; documented disaster-recovery plan for Redis, PostgreSQL, and the MQTT cluster. |

---

## 4. System Architecture

```
Client App/Server
      |
      v
   Go API --(validate, idempotency check, classify priority, enqueue)-->
      |
      v
   Redis Streams — Priority Lanes
      [ otp_queue (highest) | transactional_queue (medium) | marketing_queue (lowest) ]
      |
      v
   Worker Pool (stateless, horizontally scaled, drains otp_queue first)
      |
      v
   Routing Strategy Selector (fastest / lowest-cost / highest-reliability / geo-affinity / profit-optimized)
      |
      v
   Device Selector
      - Reliability score (uptime, latency, success rate, capacity)
      - Reputation score (complaint rate, block events, delivery trend, fraud-flag history)
      - SIM Health Engine gate (DEGRADED/BLOCKED excluded or penalized; predictive trend flagging)
      - Global throttling gate (per-country / per-carrier / per-prefix limits)
      - Circuit breaker gate (device/account/carrier)
      - Active PING/PONG liveness check
      |
      v
   MQTT Broker Cluster (Mosquitto -> clustered EMQX at scale; TLS + per-device ACL;
                         shared subscriptions for HA)
      |
      v
   Android Device (per SIM slot) --SIM--> Carrier --> Recipient
      |
      ^ MQTT: status / PONG / delivery report / health payload
      |
      v
   Delivery Confidence Engine  --->  Webhook Dispatcher (HMAC-signed) ---> Customer's URL
```

---

## 5. Component Breakdown

### 5.1 Backend (Go)
- **API layer:** authenticates, validates, checks idempotency, classifies priority, enqueues, returns `202 Accepted`.
- **Worker pool:** drains priority lanes in order; applies routing strategy; runs device selection through reliability, reputation, SIM health, global throttle, and circuit breaker gates; active PING check; MQTT dispatch; status update.
- Also owns: OTP handling, encryption, billing, webhook dispatch, admin/account auth, SIM Health Engine (with trend prediction), fraud/abuse detection, delivery confidence scoring, circuit breaker state machines.

### 5.2 Queue Layer
Redis Streams, three priority lanes per account, strict drain order with a small anti-starvation allowance for lower lanes, bounded per-account/per-lane queue depth, consumer groups for horizontal scaling, dead-letter stream for exhausted retries.

### 5.3 MQTT Broker (High Availability)
Mosquitto by default; clustered, multi-node EMQX at scale with shared subscriptions so device connectivity survives a single node failure. Broker cluster health is a first-class monitored metric.

### 5.4 Android App (Kotlin + Jetpack)
- MQTT client, SMS Manager (per SIM), delivery tracking, PING/PONG, heartbeat with health payload.
- Foreground service (mandatory Android 8+) with persistent notification.
- Watchdog (local alarm-based restart) and Boot Receiver.
- **JobScheduler fallback (new):** a secondary scheduled task using `JobScheduler`, independent of the alarm-based watchdog, as a second local recovery path — since some OEMs suspend one scheduling mechanism but not the other.
- **Exact alarm permission handling (new):** on Android 13+, the app requests and gracefully degrades around the `SCHEDULE_EXACT_ALARM` permission, since exact alarms are increasingly restricted and the app must not silently fail if denied.
- **FCM-triggered revival:** backend wakes the app via a high-priority FCM message if a heartbeat window is missed.
- **Device risk-state classification (new):** each device reports/derives a `device_state` of `ACTIVE`, `DOZE_RISK`, or `OEM_KILL_RISK` (based on manufacturer, OS version, and observed background-execution behavior), surfaced in the dashboard so operators know which physical devices need onboarding follow-up, not just which are currently offline.
- OEM battery-whitelist onboarding guide, keyed off `Build.MANUFACTURER`, with an explicit user-facing warning if a device remains in `OEM_KILL_RISK` state after onboarding.
- Server-enforced randomized 2–5 second pacing between sends on the same SIM.
- Local send queue for connectivity gaps; auto-update mechanism.

### 5.5 Admin Dashboard (React.js + Tailwind CSS)
Includes: SIM health (current + trend), delivery confidence breakdown, routing-strategy configuration per account, circuit breaker status board, priority-queue depth, carrier-reputation view, cost/profit view with profit-optimized routing toggle, fraud-flag review, account risk scores, device risk-state view, disaster-recovery status indicators.

### 5.6 Public API & Developer Docs
REST endpoint reference, code samples, SDKs (Node.js, Python), API playground, public status page reflecting API, queue, and broker cluster health.

---

## 6. Security Architecture

### 6.1 API Security
Pre-shared, scoped, hashed, revocable API keys; per-key rate limiting.

### 6.2 Admin & Account Security
bcrypt/argon2 hashing, JWT via HTTP-only cookies, mandatory admin 2FA, forced re-auth for sensitive actions.

### 6.3 Encryption
AES-256-GCM at rest (envelope encryption); OTPs stored only as HMAC-SHA256 hashes, never plaintext.

### 6.4 Transport Security
TLS 1.2+ everywhere; MQTT exclusively over TLS, plaintext disabled by default in all environments.

### 6.5 Device Credential Lifecycle
Unique, revocable, rotatable MQTT credentials per device/SIM.

### 6.6 Webhook Signature Verification & Retry
```
X-Signature: HMAC-SHA256(payload, webhook.secret)
retry_policy:
  strategy: exponential_backoff
  max_attempts: 5
  window: 24 hours
  on_exhaustion: dead_letter (visible + manually resendable in dashboard)
```
Signature verification is required by the customer before trusting payload contents; the secret is shown once and regenerable on demand.

### 6.7 Abuse Prevention (Baseline Controls)
Per-phone/per-account rate limiting, recipient/keyword blacklisting, platform-wide STOP/UNSUBSCRIBE handling. Extended by the fraud engine (§19).

---

## 7. MQTT Design & Broker High Availability

### 7.1 Topics
```
devices/{deviceId}/commands
devices/{deviceId}/status
devices/{deviceId}/inbox
devices/{deviceId}/ping
devices/{deviceId}/pong
```

### 7.2 QoS Levels
| Message Type | QoS |
|---|---|
| SMS send command | 1 |
| PING/PONG | 1 |
| Heartbeat | 0 |

### 7.3 HA
Clustered, multi-node EMQX at scale, shared subscriptions, no single-node dependency. Cluster node count, replication lag, and connection distribution are monitored metrics.

---

## 8. Android App Specification

### 8.1 Device Identity
`ANDROID_ID` + SIM slot index → unique logical `device_id`.

### 8.2 Modules
MQTT Manager, SMS Manager, Background Service (foreground), Watchdog, JobScheduler fallback, Boot Receiver, FCM Revival Listener, Heartbeat System (with health + risk-state payload), Local Queue Manager.

### 8.3 Permissions
`SEND_SMS`, `RECEIVE_SMS`, `READ_SMS`, `READ_PHONE_STATE`, `INTERNET`, `FOREGROUND_SERVICE`, `RECEIVE_BOOT_COMPLETED`, battery-optimization exemption, FCM registration, and (Android 13+) `SCHEDULE_EXACT_ALARM` with graceful degradation if denied.

### 8.4 Onboarding Flow
1. Install app. 2. Scan pairing QR / enter token. 3. Select SIM slot(s). 4. Grant permissions. 5. Accept battery-optimization exemption. 6. Follow OEM-specific whitelist guide if the device is classified `OEM_KILL_RISK`. 7. Confirm "Online" status, with risk-state shown if not `ACTIVE`.

The app deliberately includes this full pairing/permissions/risk-classification flow, in addition to a device status view mirroring the dashboard — a device cannot be usefully onboarded with a stripped-down screen set, since pairing and SIM selection are how a device becomes usable at all.

---

## 9. Ping–Pong Liveness System

Unchanged mechanics (passive heartbeat every 15–30 sec, active PING before dispatch with a 3-sec timeout, 45-sec online window), now also feeding the `device_state` risk classification (§5.4) and triggering FCM revival on a missed window before the device is given up on for a cycle.

---

## 10. Queue, Priority & Backpressure

### 10.1 Priority Lanes
```
otp_queue            — highest priority, max queue age 90 seconds
transactional_queue  — medium priority, max queue age 15 minutes
marketing_queue      — lowest priority, max queue age 15 minutes
```

### 10.2 Worker Drain Order
Strict priority order with a small anti-starvation allowance (e.g., 1 lower-priority job per 10 OTP jobs).

### 10.3 Backpressure
Per-account, per-lane max queue depth by plan; `429` + `Retry-After` beyond the limit; real-time visibility via dashboard/API.

### 10.4 Worker Pool
Stateless, Redis Streams consumer groups, autoscaled on queue-depth metric.

---

## 11. Device Selection — Weighted Scoring & Reputation

### 11.1 Reliability Score
```
reliability_score = (success_rate * 0.4) + (uptime_ratio * 0.2) + (1 - normalized_latency) * 0.2 + (available_capacity_ratio * 0.2)
```

### 11.2 Reputation Score (now includes fraud-flag history)
```
reputation_score = (1 - complaint_rate) * 0.4 + (delivery_trend_stability) * 0.3 + (1 - block_event_frequency) * 0.2 + (1 - fraud_flag_weight) * 0.1
```
Fraud-flag history (§19) is folded into this single score rather than introducing a separate "trust score" — a device or account's fraud history is, functionally, a carrier-perception and risk signal, and belongs with reputation rather than as a third overlapping metric that would need to be kept in sync with the other two.

### 11.3 Smart Rotation Refinements
- Avoid sending to the same receiver via the same SIM repeatedly within a short window (tracked per `recipient + device_id` pair), since repeated sender→receiver pairing is itself a carrier pattern-detection signal.
- A small randomization factor (5–10%) is applied on top of the deterministic score ranking, so device selection isn't perfectly predictable even among similarly-scored candidates.
- Temporal spreading: when a bulk batch targets many recipients, sends are spread across a short window rather than fired as a single burst, even if the account's overall rate limit would technically allow a burst.

### 11.4 Selection Query (illustrative)
```sql
SELECT * FROM devices
WHERE status = 'ONLINE'
  AND sim_health_status != 'BLOCKED'
  AND messages_last_min < rate_limit_per_device
  AND NOT global_throttle_exceeded(country_code, carrier, prefix)
  AND NOT circuit_breaker_open(device_id)
ORDER BY (reliability_score * strategy_reliability_weight
        + reputation_score * strategy_reputation_weight) DESC,
        RANDOM() * 0.1
LIMIT 5;
```
`strategy_*_weight` values are set by the active routing strategy (§16).

---

## 12. Idempotency & Deduplication

Every send request requires an `Idempotency-Key` (client-supplied or server-derived). Stored in Redis, 5-minute dedup window. Repeated requests within the window return the original result without resending.

---

## 13. Carrier-Aware & Global Rate Control

### 13.1 Per-Device Burst Limits
```
max_per_minute: 10
max_per_hour: 100
```

### 13.2 Randomized Send Pacing
Server-enforced 2–5 second delay between consecutive dispatches to the same device.

### 13.3 Global Throttling Layer
```
per_country_limit
per_carrier_limit
per_prefix_limit
```
Checked as a gate during device selection; jobs wait in queue rather than forcing an over-limit send.

### 13.4 Carrier-Aware Retry
Prefers a different-carrier device on retry (if the fleet has carrier diversity), then same-carrier different-number with delay-based backoff, then any healthy device — bounded to 3 distinct-device attempts.

---

## 14. SIM Health & Predictive Ban Detection

### 14.1 Reactive Thresholds
```
if delivery_rate < 60% over a rolling 5-minute window:
    mark device.sim_health_status = 'DEGRADED'

if delivery_rate < 30% over the same window:
    mark device.sim_health_status = 'BLOCKED'
```

### 14.2 Predictive Trend Detection (new)
Rather than waiting for a hard threshold breach, the engine also tracks the *slope* of delivery-rate decline over a longer window (e.g., the last 3 hours). A statistically meaningful downward trend — even while still above the 60% reactive threshold — triggers a **pre-emptive load reduction** on that device: it's not removed from the pool, but its selection weight is reduced proportionally to the trend severity, buying time to catch a developing problem before it becomes a hard block.

### 14.3 Action on Detection
- `DEGRADED` — heavily deprioritized, not excluded.
- `BLOCKED` — excluded entirely, flagged for manual review, account owner notified.
- Trending-down but still `HEALTHY` — selection weight reduced proportionally; visible in the dashboard as an early warning, not just a binary state.
- Manual reinstatement available after investigation.

---

## 15. Delivery Confidence Model

### 15.1 The Problem
Android's SMS delivery reporting is not fully trustworthy: a "sent" broadcast confirms the radio accepted the message for transmission, not that the carrier delivered it to the recipient. Some carriers don't return delivery receipts at all, and some delivery receipts are unreliable or delayed. Treating "sent" as "delivered" would silently corrupt every downstream metric that depends on delivery truth — SIM health, reputation scoring, and customer-facing delivery-rate reporting.

### 15.2 Status Model
```
delivery_status:
  SENT               — device confirmed handoff to the radio/carrier
  CARRIER_ACCEPTED   — carrier-level delivery receipt received, if the carrier supports it
  PROBABLE_DELIVERED — heuristic inference (see below), used when no carrier receipt arrives
  FAILED             — explicit failure signal from device or carrier
```

### 15.3 Confidence Score
```
confidence_score = (delivery_report_weight * 0.5)
                  + (historical_success_pattern_for_this_device_and_route * 0.3)
                  + (carrier_reliability_for_reporting * 0.2)
```
Where `historical_success_pattern` reflects how often this device/carrier combination's "SENT" status has historically correlated with a later-confirmed delivery or inbound reply, and `carrier_reliability_for_reporting` reflects how often a given carrier is known to actually return delivery receipts at all (some never do, which should lower confidence-scoring weight on the absence of a receipt, not treat the absence as a failure).

### 15.4 Downstream Use
This confidence score — not a raw binary flag — feeds the SIM Health Engine (§14) and reputation scoring (§11.2), so a device isn't marked degraded purely because its carrier doesn't return delivery receipts; and it's surfaced to customers as a `delivery_status` field (not hidden), so integrators understand a `PROBABLE_DELIVERED` result is a confidence-weighted inference rather than a hard guarantee — an honest signal rather than a false promise of certainty Android itself can't provide.

---

## 16. Routing Strategy Layer

### 16.1 Selectable Strategies
```
routing_strategy:
  fastest_delivery      — weights latency and uptime heavily
  lowest_cost           — weights device_cost_profile heavily (see §21)
  highest_reliability   — weights reliability_score heavily (default for OTP)
  geo_affinity          — prefers a device whose SIM country/region matches the recipient's
  profit_optimized      — weights toward maximizing (customer price - device cost) per send
```

### 16.2 Configuration
Default strategy is `highest_reliability` for OTP traffic (non-configurable, to protect OTP delivery guarantees) and `lowest_cost` for marketing/bulk traffic by default, both overridable per account on Pro/Scale/Enterprise plans. `profit_optimized` is a platform-operator-facing strategy (not customer-facing) for internal routing economics, distinct from what a customer selects for their own traffic.

### 16.3 Why This Matters
Reusing the existing reliability/reputation/cost scores as strategy-weighted inputs (§11.4) means this is a configuration layer on top of already-computed data, not a new scoring subsystem — it avoids duplicating logic while giving real product/monetization flexibility (e.g., an Enterprise plan feature: "choose your routing priority").

---

## 17. Circuit Breaker System

### 17.1 Device-Level
```
if device.failure_rate_5min > threshold:
    open_circuit(device_id)  # temporarily excluded from selection
    half_open_after: cooldown_period
    close_on: N consecutive successful sends during half-open trial
```

### 17.2 Account-Level
```
if account.failure_rate_spikes_above_baseline:
    throttle_account(reduced_rate_limit, duration)
```
Protects the platform (and other accounts sharing device pools) from one account's sudden failure spike, independent of whether that spike stems from bad input data, abuse, or a bug in the customer's integration.

### 17.3 Carrier-Level
```
if carrier.aggregate_failure_rate_spikes:
    reduce_traffic_to(carrier, reduction_pct, duration)
```
Distinct from per-device SIM health — this responds to a carrier-wide pattern (e.g., a network-side issue affecting many SIMs on the same carrier simultaneously) rather than one device's individual degradation.

### 17.4 State Visibility
All three circuit-breaker levels are visible on the dashboard's status board (§5.5) — open circuits are not silent; they're an operational signal, not just an internal safety mechanism.

---

## 18. OTP System

### 18.1 Generation & Validation
4–6 digit code, Redis `otp:{phone}`, 5-minute TTL, HMAC-SHA256 hash only, 5-attempt cap with lockout.

### 18.2 Storage
| Storage | Format | Retention |
|---|---|---|
| Redis | HMAC-hashed | 5-min TTL |
| PostgreSQL (audit) | Metadata only | 1 year |

### 18.3 Queue Policy
Routed through `otp_queue`, 90-second max queue age, well inside the 5-minute validity window.

---

## 19. Fraud & Abuse Detection

Pattern/velocity-based, not content-surveillance-based:
- OTP-spam pattern (one IP/account, many distinct numbers, short window).
- Velocity anomaly on account send volume or failure rate, escalating to a fraud-review queue.
- Recipient/keyword blacklist matches feed the same review queue.
- Fraud-flag history now feeds the reputation score (§11.2) rather than a separate trust metric.
- Flags surfaced in the dashboard's fraud-review page; a human reviews before permanent suspension.

---

## 20. Multi-Tenant Isolation

- **Device pool isolation** (opt-in, plan-dependent) for Scale/Enterprise accounts.
- **Account risk score**, independent of device scores, tracking an account's own fraud/abuse history; high-risk accounts can be automatically restricted to a smaller, conservative subset of the shared pool without a full suspension.
- Account-level circuit breaking (§17.2) is a further isolation mechanism — a spiking account is throttled before it can degrade the shared pool for others.

---

## 21. Cost Tracking & Profit-Optimized Routing

### 21.1 Device Cost Profile
```
device_cost_profile:
  device_id, sim_cost_per_sms, region_cost_multiplier, plan_context, updated_at
```

### 21.2 Profit Visibility & Routing
Cost data joined against device cost profile and account plan pricing produces a per-account, per-device profit/loss view, and feeds the `profit_optimized` and `lowest_cost` routing strategies (§16) directly — the same cost data now has two uses: reporting and active routing decisions, rather than being reporting-only.

### 21.3 Geo Awareness & Delivery Intelligence
`country_code`/`region` per device, feeding both `geo_affinity` routing and the dashboard's delivery-intelligence views (success trends by carrier/region, time-to-delivery trends, SIM health distribution).

---

## 22. Database Design (PostgreSQL — Complete Schema)

### accounts
```
id, name, email, password_hash, plan_id, retention_days, created_at, verified, status, risk_score
```

### api_keys
```
id, account_id, key_hash, label, scopes, expires_at, revoked_at, created_at
```

### physical_devices
```
id (ANDROID_ID), account_id, model, os_version, app_version, battery_level,
network_type, device_state (ACTIVE/DOZE_RISK/OEM_KILL_RISK)
```

### devices (per-SIM logical identity)
```
id, physical_device_id, account_id, sim_slot, carrier, status, sim_health_status,
health_trend_slope, last_seen, last_ping_at, last_pong_at, messages_sent_count,
last_used_at, mqtt_credential_id, reliability_score, reputation_score,
complaint_count, block_event_count, fraud_flag_weight, success_rate_24h,
uptime_ratio_24h, avg_latency_ms, country_code, region, max_per_minute,
max_per_hour, isolated_pool_id, circuit_breaker_state
```

### mqtt_credentials
```
id, device_id, username, credential_hash_or_cert_ref, issued_at, revoked_at
```

### messages
```
id, device_id, api_key_id, direction, recipient, sender, encrypted_message,
message_type, priority_lane, template_id, status, delivery_status,
confidence_score, error_reason, created_at, delivered_at, purge_after,
idempotency_key, routing_strategy_used
```

### idempotency_keys
```
key, account_id, message_id, created_at, expires_at
```

### otp_metadata
```
message_id, phone, verified, attempts, created_at, expires_at
```

### templates
```
id, account_id, name, body, variables, approval_status, approved_at, created_at
```

### webhooks
```
id, account_id, url, events[], secret, active, last_rotated_at
```

### webhook_deliveries
```
id, webhook_id, message_id, attempt_count, last_status, last_attempt_at
```

### plans / subscriptions
```
id, account_id, plan_type, billing_cycle, status, renewal_date, stripe_customer_id,
quota_daily, quota_monthly, overage_buffer_pct, max_queue_depth, dedicated_pool,
default_routing_strategy
```

### usage_counters, analytics_daily, cost_tracking, device_cost_profile — unchanged from prior version.

### abuse_flags, fraud_flags — unchanged.

### global_throttle_counters — unchanged.

### circuit_breaker_events (new)
```
id, scope (device/account/carrier), scope_value, opened_at, closed_at, reason
```

### queue_dead_letters — unchanged.

---

## 23. Full API Specification

Adds to the prior endpoint list:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/messages/{id}/confidence` | Delivery confidence breakdown for a message |
| PUT | `/api/v1/account/routing-strategy` | Set the account's default routing strategy (Pro/Scale/Enterprise) |
| GET | `/admin/circuit-breakers` | Current circuit breaker states across device/account/carrier scopes |

All prior endpoints (auth, API keys, devices, send, OTP, history, templates, webhooks, usage, analytics, admin) remain as previously specified, with `messages` responses now including `delivery_status` and `confidence_score` fields.

---

## 24. Admin Dashboard — Page List

1. Dashboard — totals, success rate, active devices, priority-queue depth.
2. SMS History — filterable, now showing delivery confidence per message.
3. Devices — status, SIM health (current + trend), risk state, reliability + reputation scores.
4. Templates — CRUD, approval workflow.
5. Webhooks — configure, HMAC secret management, delivery logs, resend.
6. API Playground.
7. Billing — plan, invoices, usage-vs-quota, overage notices.
8. Analytics — cost/profit view, delivery intelligence, routing-strategy performance comparison.
9. Queue & Reliability — per-lane depth, worker health, dead-letter viewer.
10. **Circuit Breakers (new)** — live status board across device/account/carrier scopes.
11. Fraud & Risk Review — fraud-flag queue, account risk scores.
12. Profile & Security.
13. Admin/Superadmin Panel — accounts, suspensions, template approvals, platform-wide metrics, broker cluster and disaster-recovery status.

---

## 25. Plans & Billing

Unchanged tier structure (Free/Pro/Scale/Enterprise) from the prior version, with routing-strategy selection now gated to Pro and above, and dedicated device pools available as a Scale add-on / included in Enterprise.

---

## 26. Non-Functional Requirements

| Category | Requirement |
|---|---|
| API Latency | p95 < 150ms for enqueue acceptance |
| Queue Processing Latency | p95 < 5 sec (OTP lane), < 30 sec (other lanes, normal load) |
| API Availability | 99.5%+ |
| Broker Availability | Clustered, no single-node dependency post-migration |
| Device-layer Availability | Best-effort, mitigated by reliability/reputation scoring, SIM health prediction, circuit breakers, and FCM revival |
| Security | AES-256-GCM at rest; TLS/MQTT-TLS in transit; hashed keys/OTPs; per-device credentials |
| Scalability | Every layer (workers, API nodes, broker cluster, device fleet) scales independently |
| Data Retention | 90 days (messages), 1 year (OTP metadata), configurable, 30-day floor |
| Delivery Reporting Honesty | Delivery status exposed as a confidence-scored field, never presented as a false guarantee |

---

## 27. Failure Handling & Retry Strategy

| Scenario | Behavior |
|---|---|
| No eligible device available | Job queued to its lane's max age, then dead-letters with explicit reason |
| Device fails active PING | Skip, try next candidate; trigger FCM revival if unexpectedly unresponsive |
| Device circuit breaker open | Excluded from selection until half-open cooldown passes |
| SIM health DEGRADED / trending down | Deprioritized proportionally, not excluded |
| SIM health BLOCKED | Excluded entirely, flagged for manual review |
| Account circuit breaker open | Account's send rate throttled for the cooldown duration |
| Carrier circuit breaker open | Traffic to that carrier reduced platform-wide for the cooldown duration |
| Send fails | Retry prefers different-carrier device, then same-carrier different-number, then any healthy device — bounded to 3 attempts |
| MQTT publish failure | Requeue with backoff; dead-letter after max attempts |
| Webhook delivery failure | Retry, exponential backoff, 5 attempts over 24h, then dead-letter |
| Account exceeds max queue depth | `429`; existing queued jobs continue |
| Global throttle saturated | Job waits in queue |
| Broker node failure | Cluster failover via shared subscriptions, no manual intervention for single-node loss |

---

## 28. Observability

- **Metrics:** Prometheus, tracking message latency, per-lane queue depth, delivery success/confidence distribution, device uptime, carrier failure rate, circuit breaker state changes.
- **Dashboards:** Grafana, built on the above metrics.
- **Logs:** centralized structured logging aggregated via Loki (or equivalent), correlated with trace IDs.
- **Tracing:** OpenTelemetry instrumentation across the API → queue → worker → MQTT dispatch path, so a single message's full lifecycle latency is traceable end-to-end, not just visible as separate disconnected metrics.

---

## 29. Disaster Recovery

| Component | Strategy |
|---|---|
| Redis | AOF persistence enabled; replica(s) for failover; queue state is not treated as safely ephemeral given it holds in-flight sends |
| PostgreSQL | Streaming replication to a standby; point-in-time recovery enabled |
| MQTT Cluster | Multi-node with automatic failover (§7.3); no single node is a dependency once past the clustering threshold |
| Deployment | Multi-zone deployment for the managed SaaS, so a single availability zone outage does not take down the platform |
| Runbook | Documented recovery procedures for each component failure mode, tested periodically (see §30) rather than assumed to work |

---

## 30. Testing Strategy

Adds to prior testing scope:
- **Delivery confidence tests:** simulate carriers that never return receipts, confirm confidence scoring degrades gracefully rather than misclassifying as failure.
- **Circuit breaker tests:** simulate a failure spike at each scope (device/account/carrier), confirm correct open/half-open/close transitions.
- **Disaster recovery drills:** simulated Redis failover, PostgreSQL standby promotion, and MQTT node kill, confirming the documented runbooks actually work, not just exist on paper.
- **Predictive SIM health tests:** simulate a gradual delivery-rate decline and confirm pre-emptive load reduction triggers before the hard 60% threshold is crossed.
- Prior scope (unit, integration, queue, load, fraud-detection, security) unchanged.

---

## 31. Deployment & Infrastructure

Unchanged core setup (Kubernetes SaaS, Docker Compose self-hosted, Nginx, Cloudflare edge), extended with multi-zone deployment (§29) and full observability stack (§28) as first-class infrastructure requirements, not optional additions.

---

## 32. Legal & Compliance

- Terms of Service: not a Tier-1 carrier route; customer responsible for compliant use.
- Country restrictions enforced at the API layer.
- Template approval required where local regulation mandates it.
- Privacy Policy covering retention and deletion rights; GDPR-aware handling.
- STOP/UNSUBSCRIBE honored platform-wide.
- **Regulatory frameworks to account for (informational, not legal advice):** depending on target markets, this includes US TCPA rules around consent and opt-out for automated messaging, and India's DLT registration requirements for commercial SMS senders, among other region-specific regimes. **This PRD names these as considerations the product must accommodate technically (e.g., consent tracking, sender registration fields) — actual compliance determination requires review by qualified legal counsel in each target jurisdiction before launch, not just an engineering checklist.**

---

## 33. Success Metrics

- Time to first successful SMS (target: <5 min).
- Delivery success rate (target: >95%, confidence-weighted).
- API availability (99.5%+), broker cluster availability (no single-node downtime post-migration).
- Duplicate-send rate (target: 0%).
- OTP lane p95 latency (target: <5 sec).
- SIM health trend accuracy — how often predictive flagging catches degradation before a hard BLOCKED threshold is hit.
- Circuit breaker false-positive rate (breakers opening on noise rather than real failure spikes).
- Fraud-flag precision.
- Free-to-paid conversion; webhook delivery success rate.

---

## 34. Future Enhancements (Explicitly Out of Scope for This Build)
- AI-based predictive routing beyond the current reliability/reputation/strategy model.
- Fallback delivery channels: WhatsApp, Telegram, Voice OTP.
- Routing decisions driven by geo data beyond the current `geo_affinity` strategy (e.g., dynamic cross-border optimization).

---

*This is the complete, final Version 1.0 PRD. It incorporates the delivery confidence model, predictive SIM health, routing strategy layer, circuit breakers, disaster recovery, expanded observability, OEM-kill refinements, and smart-rotation upgrades — on top of the earlier priority queues, SIM health/ban detection, weighted scoring, async architecture, idempotency, and security foundations. No further scoping decisions are required before implementation begins.*