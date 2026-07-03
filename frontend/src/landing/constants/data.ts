import {
  Zap, Shield, Globe, BarChart3,
  Smartphone, Lock, Users,
  Settings, Workflow, Database,
  Cloud, Code, Terminal, GitBranch, Cpu, Eye,
  Route, MessageSquare, Server, CreditCard,
  ShieldCheck, FileCheck, Key,
} from 'lucide-react'

export const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Ecosystem', href: '#ecosystem' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Developers', href: '#developers' },
] as const

export const TRUSTED_COMPANIES = [
  'Acme Corp', 'TechFlow', 'DataSync', 'CloudBase', 'NetPulse',
  'SkyLink', 'ByteForge', 'CodeNest', 'DevHub', 'PixelCraft',
  'StackBuild', 'WebForge',
] as const

// ── Features: ONLY real system capabilities from the PRD ──
export const FEATURES = [
  {
    icon: Lock,
    title: 'Authentication & 2FA',
    description: 'JWT-based auth with optional TOTP two-factor authentication. Role-based access control for admin, staff, and viewer roles.',
    color: 'from-blue-500 to-cyan-400',
    span: 'col-span-1',
  },
  {
    icon: Route,
    title: 'Smart Routing Strategies',
    description: '5 selectable routing strategies: fastest delivery, lowest cost, highest reliability, geo-affinity, and profit-optimized.',
    color: 'from-purple-500 to-pink-400',
    span: 'col-span-1',
  },
  {
    icon: Smartphone,
    title: 'Device Fleet Management',
    description: 'Monitor Android devices with real SIM cards. Track SIM health, battery, network type, and device risk state (Active / Doze Risk / OEM Kill Risk).',
    color: 'from-rose-500 to-pink-400',
    span: 'col-span-1',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Delivery confidence scores, per-carrier success rates, queue depth monitoring, and cost/profit tracking across your fleet.',
    color: 'from-green-500 to-emerald-400',
    span: 'col-span-1',
  },
  {
    icon: MessageSquare,
    title: 'Priority Queue System',
    description: 'Three priority lanes — OTP (highest), transactional (medium), marketing (lowest) — with strict drain order and backpressure controls.',
    color: 'from-orange-500 to-amber-400',
    span: 'col-span-1',
  },
  {
    icon: ShieldCheck,
    title: 'Circuit Breakers',
    description: 'Automatic circuit breakers at device, account, and carrier level. Self-healing with configurable cooldown and half-open trials.',
    color: 'from-cyan-500 to-blue-400',
    span: 'col-span-1',
  },
] as const

// ── Ecosystem: the 4 real products ──
export const ECOSYSTEM = [
  {
    icon: Settings,
    title: 'Admin Dashboard',
    description: 'Full control panel with account management, template approvals, fraud review, billing oversight, circuit breaker status, and platform-wide analytics.',
    color: 'from-blue-500 to-indigo-500',
    tech: 'React + Tailwind CSS',
  },
  {
    icon: Users,
    title: 'Member Portal',
    description: 'Customer-facing portal for device management, message history, analytics, template CRUD, webhook configuration, and subscription management.',
    color: 'from-purple-500 to-violet-500',
    tech: 'React + Tailwind CSS',
  },
  {
    icon: Smartphone,
    title: 'Android Client',
    description: 'Kotlin + Jetpack Compose app that turns Android phones into SMS-sending nodes. MQTT client, SIM health monitoring, foreground service with watchdog.',
    color: 'from-green-500 to-emerald-500',
    tech: 'Kotlin + Jetpack Compose',
  },
  {
    icon: Server,
    title: 'Backend Platform',
    description: 'Go API with Redis Streams queues, PostgreSQL storage, MQTT broker cluster, delivery confidence engine, fraud detection, and webhook dispatch.',
    color: 'from-amber-500 to-orange-500',
    tech: 'Go + PostgreSQL + Redis + MQTT',
  },
] as const

// ── Smart Routing: real routing strategies from the backend ──
export const ROUTING_STRATEGIES = [
  {
    icon: Zap,
    title: 'Fastest Delivery',
    description: 'Weights latency and uptime heavily to minimize time-to-delivery for time-sensitive messages.',
  },
  {
    icon: CreditCard,
    title: 'Lowest Cost',
    description: 'Weights device cost profiles to minimize per-message cost. Default for marketing and bulk traffic.',
  },
  {
    icon: Shield,
    title: 'Highest Reliability',
    description: 'Weights reliability scores heavily. Default for OTP traffic to maximize delivery guarantees.',
  },
  {
    icon: Globe,
    title: 'Geo-Affinity',
    description: 'Prefers devices whose SIM country/region matches the recipient for better local delivery rates.',
  },
] as const

// ── Security: real features from the PRD ──
export const SECURITY_FEATURES = [
  { icon: Lock, title: 'AES-256-GCM Encryption', desc: 'All message content, OTPs, and PII encrypted at rest with envelope encryption.', color: 'text-blue-400' },
  { icon: Shield, title: 'TLS Everywhere', desc: 'TLS 1.2+ for all API traffic. MQTT exclusively over TLS — plaintext disabled.', color: 'text-purple-400' },
  { icon: ShieldCheck, title: 'JWT + 2FA Auth', desc: 'Secure JWT authentication with optional TOTP two-factor for admin accounts.', color: 'text-green-400' },
  { icon: Key, title: 'Scoped API Keys', desc: 'Pre-shared, hashed, revocable API keys with per-key rate limiting and scope restrictions.', color: 'text-cyan-400' },
  { icon: Eye, title: 'HMAC Webhooks', desc: 'All webhook payloads signed with HMAC-SHA256. Automatic retry with exponential backoff.', color: 'text-amber-400' },
  { icon: FileCheck, title: 'Fraud Detection', desc: 'Pattern-based fraud and abuse detection with velocity anomaly monitoring and manual review queue.', color: 'text-rose-400' },
] as const

// ── Integrations: only real backend-supported integrations ──
export const INTEGRATIONS = [
  { icon: Code, name: 'REST API' },
  { icon: Terminal, name: 'CLI Tool' },
  { icon: Database, name: 'PostgreSQL' },
  { icon: Cloud, name: 'MQTT Broker' },
  { icon: GitBranch, name: 'Webhooks' },
  { icon: Cpu, name: 'Android SDK' },
  { icon: Server, name: 'Redis Streams' },
  { icon: CreditCard, name: 'Stripe' },
] as const

export const CREDIBILITY_POINTS = [
  {
    icon: Route,
    title: 'Multi-Strategy Routing',
    description: '5 routing strategies with weighted scoring across reliability, reputation, cost, and geo-affinity — not a single hardcoded path.',
  },
  {
    icon: Shield,
    title: 'Predictive SIM Health',
    description: 'Proactive health monitoring with trend slope detection. Devices are load-reduced before hitting hard failure thresholds.',
  },
  {
    icon: Eye,
    title: 'Delivery Confidence Model',
    description: 'Honest delivery reporting with confidence scores based on carrier receipt patterns, device history, and signal sources.',
  },
  {
    icon: Workflow,
    title: 'Circuit Breaker System',
    description: 'Three-level circuit breakers (device, account, carrier) with automatic open/half-open/close state machines.',
  },
] as const

// ── Pricing: mapped to real plan types from the backend ──
export const PRICING_PLANS = [
  {
    name: 'Free',
    planId: 'free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'For getting started and testing',
    features: [
      '1,000 SMS/month',
      '2 device connections',
      'Basic analytics',
      'Community support',
      'Standard routing',
      'API access',
    ],
    cta: 'Get Started Free',
    popular: false,
  },
  {
    name: 'Pro',
    planId: 'pro',
    monthlyPrice: 49,
    yearlyPrice: 490,
    description: 'For growing businesses',
    features: [
      '50,000 SMS/month',
      '10 device connections',
      'Advanced analytics & charts',
      'Priority support',
      'Routing strategy selection',
      'Custom webhooks',
      'Template management',
      'OTP system',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Scale',
    planId: 'scale',
    monthlyPrice: 199,
    yearlyPrice: 1990,
    description: 'For high-volume operations',
    features: [
      '500,000 SMS/month',
      '50 device connections',
      'Full analytics suite',
      'Dedicated support',
      'All routing strategies',
      'Dedicated device pools',
      'Cost/profit tracking',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
] as const

export const FAQ_ITEMS = [
  {
    question: 'How does the routing strategy system work?',
    answer: 'AeroXe Bee offers 5 selectable routing strategies: fastest delivery, lowest cost, highest reliability, geo-affinity, and profit-optimized. Each strategy applies different weights to device reliability scores, reputation scores, and cost profiles to select the optimal device for each message.',
  },
  {
    question: 'How does device fleet management work?',
    answer: 'Install the Android app on phones with SIM cards, pair them via QR code, and they become SMS-sending nodes. Each device is monitored for SIM health, battery, network quality, and risk state. The platform automatically manages device selection, rate limiting, and circuit breaking.',
  },
  {
    question: 'What is delivery confidence scoring?',
    answer: 'Android SMS delivery reports are not fully reliable. Our confidence model combines delivery report signals, historical success patterns, and carrier reporting reliability to produce an honest confidence score — not a false binary "delivered" claim.',
  },
  {
    question: 'How does the OTP system work?',
    answer: 'Generate 4-6 digit codes via API, routed through the highest-priority OTP queue with a 90-second max queue age. Codes are stored as HMAC-SHA256 hashes with 5-minute TTL and 5-attempt lockout. OTP audit metadata is retained for 1 year.',
  },
  {
    question: 'What security measures are in place?',
    answer: 'AES-256-GCM encryption at rest, TLS 1.2+ everywhere, JWT auth with optional 2FA, scoped and revocable API keys, HMAC-signed webhooks, fraud detection, and circuit breakers at device/account/carrier level.',
  },
  {
    question: 'Can I self-host the platform?',
    answer: 'Yes. AeroXe Bee ships as both a managed SaaS product and an open-source, self-hostable platform via Docker Compose. The same codebase supports both deployment models.',
  },
] as const

// ── Real system stats (marked as sample/illustrative) ──
export const STATS = [
  { value: 95, label: 'Delivery Rate Target', suffix: '%+' },
  { value: 150, label: 'API Latency (p95)', suffix: 'ms' },
  { value: 99.5, label: 'API Uptime', suffix: '%+' },
  { value: 5, label: 'Routing Strategies', suffix: '' },
] as const

export const COMPARISON_ROWS = [
  { feature: '5 Routing Strategies', us: true, competitor1: false, competitor2: false },
  { feature: 'Device Fleet Management', us: true, competitor1: false, competitor2: true },
  { feature: 'Delivery Confidence Scores', us: true, competitor1: false, competitor2: false },
  { feature: 'SIM Health Prediction', us: true, competitor1: false, competitor2: false },
  { feature: 'Circuit Breakers', us: true, competitor1: true, competitor2: false },
  { feature: 'Priority Queue (OTP/TX/Mkt)', us: true, competitor1: true, competitor2: false },
  { feature: 'HMAC Webhook Signatures', us: true, competitor1: true, competitor2: true },
  { feature: 'Self-Hostable (Docker)', us: true, competitor1: false, competitor2: false },
  { feature: 'Fraud Detection', us: true, competitor1: false, competitor2: false },
] as const
