import {
  Zap, Shield, Globe, BarChart3,
  Smartphone, Lock, Users,
  Settings, Workflow,
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
    title: 'Secure Authentication',
    description: 'Secure login with optional two-factor authentication. Role-based access control for admins, staff, and viewers.',
    color: 'from-blue-500 to-cyan-400',
    span: 'col-span-1',
  },
  {
    icon: Route,
    title: 'Smart Routing',
    description: '5 intelligent routing strategies optimized for speed, cost, reliability, geography, or profitability — choose what matters most.',
    color: 'from-purple-500 to-pink-400',
    span: 'col-span-1',
  },
  {
    icon: Smartphone,
    title: 'Device Fleet Management',
    description: 'Turn phones into SMS-sending nodes. Real-time health monitoring, automatic failover, and intelligent load balancing across your fleet.',
    color: 'from-rose-500 to-pink-400',
    span: 'col-span-1',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Delivery confidence scores, success rates, queue monitoring, and cost tracking across your entire device fleet.',
    color: 'from-green-500 to-emerald-400',
    span: 'col-span-1',
  },
  {
    icon: MessageSquare,
    title: 'Priority Messaging',
    description: 'Three priority lanes for OTP, transactional, and marketing messages — ensuring critical messages always get delivered first.',
    color: 'from-orange-500 to-amber-400',
    span: 'col-span-1',
  },
  {
    icon: ShieldCheck,
    title: 'Automatic Failover',
    description: 'Smart circuit breakers detect issues and automatically reroute traffic. Self-healing system with configurable recovery.',
    color: 'from-cyan-500 to-blue-400',
    span: 'col-span-1',
  },
] as const

// ── Ecosystem: the 4 real products ──
export const ECOSYSTEM = [
  {
    icon: Settings,
    title: 'Admin Dashboard',
    description: 'Full control panel for account management, template approvals, fraud review, billing oversight, and platform-wide analytics.',
    color: 'from-blue-500 to-indigo-500',
    badge: 'Web App',
  },
  {
    icon: Users,
    title: 'Member Portal',
    description: 'Self-service portal for device management, message history, analytics, templates, webhooks, and subscription management.',
    color: 'from-purple-500 to-violet-500',
    badge: 'Web App',
  },
  {
    icon: Smartphone,
    title: 'Mobile Client',
    description: 'Turn any Android phone into an SMS-sending node. Real-time health monitoring, automatic failover, and intelligent load balancing.',
    color: 'from-green-500 to-emerald-500',
    badge: 'Android',
  },
  {
    icon: Server,
    title: 'Core Platform',
    description: 'Intelligent message routing, delivery confidence scoring, fraud detection, and webhook dispatch across your entire device fleet.',
    color: 'from-amber-500 to-orange-500',
    badge: 'Cloud Service',
  },
] as const

// ── Smart Routing: real routing strategies from the backend ──
export const ROUTING_STRATEGIES = [
  {
    icon: Zap,
    title: 'Fastest Delivery',
    description: 'Optimized for speed. Ideal for time-sensitive messages that need instant delivery.',
  },
  {
    icon: CreditCard,
    title: 'Lowest Cost',
    description: 'Optimized for cost efficiency. Best for marketing and bulk message campaigns.',
  },
  {
    icon: Shield,
    title: 'Highest Reliability',
    description: 'Optimized for delivery success. Ideal for OTP and critical transactional messages.',
  },
  {
    icon: Globe,
    title: 'Geo-Affinity',
    description: 'Matches messages to devices in the same region as the recipient for better local delivery.',
  },
] as const

// ── Security: user-facing security features ──
export const SECURITY_FEATURES = [
  { icon: Lock, title: 'End-to-End Encryption', desc: 'All message content, OTPs, and personal data encrypted at rest and in transit.', color: 'text-blue-400' },
  { icon: Shield, title: 'Secure Transport', desc: 'All API and device communication encrypted with industry-standard protocols. No plaintext traffic allowed.', color: 'text-purple-400' },
  { icon: ShieldCheck, title: 'Two-Factor Authentication', desc: 'Secure login with optional two-factor authentication for all admin accounts.', color: 'text-green-400' },
  { icon: Key, title: 'Scoped API Keys', desc: 'Revocable API keys with per-key rate limiting and fine-grained scope restrictions.', color: 'text-cyan-400' },
  { icon: Eye, title: 'Signed Webhooks', desc: 'All webhook payloads cryptographically signed. Automatic retry with exponential backoff.', color: 'text-amber-400' },
  { icon: FileCheck, title: 'Fraud Detection', desc: 'Pattern-based fraud and abuse detection with velocity anomaly monitoring and manual review.', color: 'text-rose-400' },
] as const

// ── Integrations: user-facing integration points ──
export const INTEGRATIONS = [
  { icon: Code, name: 'REST API' },
  { icon: Terminal, name: 'CLI Tool' },
  { icon: Cloud, name: 'Cloud Hosting' },
  { icon: GitBranch, name: 'Webhooks' },
  { icon: Cpu, name: 'Mobile SDK' },
  { icon: CreditCard, name: 'Payments' },
] as const

export const CREDIBILITY_POINTS = [
  {
    icon: Route,
    title: "Multi-Strategy Routing",
    description: "5 intelligent routing strategies that automatically select the best device for each message based on your chosen priority.",
  },
  {
    icon: Shield,
    title: "Predictive Health Monitoring",
    description: "Proactive device health tracking that detects issues early and automatically adjusts load before problems impact delivery.",
  },
  {
    icon: Eye,
    title: "Honest Delivery Reporting",
    description: "Accurate delivery visibility using multiple signal sources to give you a true picture of message delivery status.",
  },
  {
    icon: Workflow,
    title: "Automatic Failover",
    description: "Smart circuit breakers at multiple levels that detect issues and automatically reroute traffic to healthy paths.",
  },
] as const

// ── Pricing: fallback metadata for when API is unavailable ──
// Features are generated dynamically by generateFeatures() in Pricing.tsx
export const PRICING_PLANS = [
  {
    name: 'Free',
    planId: 'free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'For getting started and testing',
    cta: 'Get Started Free',
    popular: false,
  },
  {
    name: 'Pro',
    planId: 'pro',
    monthlyPrice: 29.99,
    yearlyPrice: 299.9,
    description: 'For growing businesses',
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Scale',
    planId: 'scale',
    monthlyPrice: 99.99,
    yearlyPrice: 999.9,
    description: 'For high-volume operations',
    cta: 'Contact Sales',
    popular: true,
  },
  {
    name: 'Enterprise',
    planId: 'enterprise',
    monthlyPrice: 299.99,
    yearlyPrice: 2999.9,
    description: 'For large-scale operations',
    cta: 'Contact Sales',
    popular: false,
  },
] as const

export const FAQ_ITEMS = [
  {
    question: 'How does the routing strategy system work?',
    answer: 'AeroXe Bee offers 5 selectable routing strategies optimized for different priorities: fastest delivery, lowest cost, highest reliability, geo-affinity, and profit-optimized. Each strategy intelligently selects the best device for each message based on your chosen priority.',
  },
  {
    question: 'How does device fleet management work?',
    answer: 'Install the mobile app on phones with SIM cards, pair them via QR code, and they become SMS-sending nodes. Each device is continuously monitored for health, battery, network quality, and risk state. The platform automatically manages device selection and load balancing.',
  },
  {
    question: 'What is delivery confidence scoring?',
    answer: 'Mobile SMS delivery reports are not always reliable. Our confidence model combines multiple signals to produce an honest delivery confidence score, giving you accurate visibility into message delivery status.',
  },
  {
    question: 'How does the OTP system work?',
    answer: 'Generate verification codes via API, routed through a high-priority delivery channel with automatic lockout after failed attempts. Codes expire after a short window for maximum security.',
  },
  {
    question: 'What security measures are in place?',
    answer: 'End-to-end encryption for all data, secure transport for all communication, two-factor authentication, revocable API keys with fine-grained permissions, cryptographically signed webhooks, and automatic fraud detection.',
  },
  {
    question: 'Can I self-host the platform?',
    answer: 'Yes. AeroXe Bee is available as both a managed cloud service and a self-hosted deployment. Contact our sales team for self-hosting options and pricing.',
  },
] as const

// ── Real system stats (marked as sample/illustrative) ──
export const STATS = [
  { value: 95, label: 'Delivery Rate Target', suffix: '%+' },
  { value: 150, label: 'API Latency (p95)', suffix: 'ms' },
  { value: 99.5, label: 'API Uptime', suffix: '%+' },
  { value: 5, label: 'Routing Strategies', suffix: '' },
] as const

