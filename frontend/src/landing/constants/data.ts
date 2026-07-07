import {
  Shield, BarChart3,
  Lock,
  Cloud, Code, Terminal, GitBranch, Cpu, Eye,
  MessageSquare, CreditCard,
  ShieldCheck, FileCheck, Key,
  Brain, Mic, CalendarClock, Users, ShieldBan,
} from 'lucide-react'

export const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Developers', href: '#developers' },
  { label: 'Contact Sales', href: '/contact-sales' },
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
    icon: Brain,
    title: 'Smart AI Template Generation',
    description: 'Generate SMS templates instantly using AI. Describe your message in natural language and let AI craft the perfect template with variables and formatting.',
    color: 'from-purple-500 to-pink-400',
    span: 'col-span-1',
  },
  {
    icon: Mic,
    title: 'Voice-to-Text Input',
    description: 'Dictate messages and templates using voice input. Built-in speech recognition for hands-free message composition.',
    color: 'from-rose-500 to-pink-400',
    span: 'col-span-1',
  },
  {
    icon: Users,
    title: 'Bulk SMS Campaigns',
    description: 'Send messages to thousands of recipients at once. Upload recipient lists, use templates, and track delivery per recipient — all from a single interface.',
    color: 'from-green-500 to-emerald-400',
    span: 'col-span-1',
  },
  {
    icon: CalendarClock,
    title: 'Message Scheduling',
    description: 'Schedule messages for future delivery. Set precise delivery times, manage time zones, and automatically release messages when the time comes.',
    color: 'from-orange-500 to-amber-400',
    span: 'col-span-1',
  },
  {
    icon: ShieldBan,
    title: 'Sensitive Content Protection',
    description: 'Automatic detection of prohibited content including spam, phishing, and fraudulent language. Messages flagged before they reach recipients.',
    color: 'from-cyan-500 to-blue-400',
    span: 'col-span-1',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Delivery confidence scores, success rates, queue monitoring, and cost tracking across your entire device fleet.',
    color: 'from-blue-500 to-cyan-400',
    span: 'col-span-1',
  },
  {
    icon: MessageSquare,
    title: 'Priority Messaging',
    description: 'Three priority lanes for OTP, transactional, and marketing messages — ensuring critical messages always get delivered first.',
    color: 'from-orange-500 to-amber-400',
    span: 'col-span-1',
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
    icon: Eye,
    title: "Honest Delivery Reporting",
    description: "Accurate delivery visibility using multiple signal sources to give you a true picture of message delivery status.",
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
    question: 'How does AI template generation work?',
    answer: 'Describe the message you want to send in plain English — for example "a welcome message for new users with their name and a verification link" — and our AI generates a complete SMS template with variables and formatting ready to use.',
  },
  {
    question: 'Can I schedule messages for later delivery?',
    answer: 'Yes. You can schedule any message for future delivery with precise timing. The scheduler automatically releases messages at the scheduled time, handles time zones, and provides status updates throughout the process.',
  },
  {
    question: 'How does sensitive content detection work?',
    answer: 'Our content filter automatically scans all messages for prohibited content including spam patterns, phishing attempts, hate speech, and fraudulent language. Flagged messages are blocked from sending and queued for manual review.',
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
] as const

