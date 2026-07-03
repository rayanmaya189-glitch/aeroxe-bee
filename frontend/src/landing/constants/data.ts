import {
  Zap, Shield, Globe, BarChart3, Brain,
  Smartphone, Lock, Gauge, Users, TrendingUp,
  Clock, Layers, Settings, Bell, Workflow, Database,
  Cloud, Code, Terminal, GitBranch, Cpu, Eye
} from 'lucide-react'

export const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Resources', href: '#resources' },
] as const

export const TRUSTED_COMPANIES = [
  'Acme Corp', 'TechFlow', 'DataSync', 'CloudBase', 'NetPulse',
  'SkyLink', 'ByteForge', 'CodeNest', 'DevHub', 'PixelCraft',
  'StackBuild', 'WebForge',
] as const

export const FEATURES = [
  {
    icon: Zap,
    title: 'Lightning Fast Delivery',
    description: 'Sub-second SMS delivery with intelligent routing across 200+ carriers worldwide. Our edge network ensures your messages arrive instantly.',
    color: 'from-blue-500 to-cyan-400',
    span: 'col-span-1 md:col-span-2',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-grade encryption, SOC 2 compliance, and role-based access control protect every message.',
    color: 'from-purple-500 to-pink-400',
    span: 'col-span-1',
  },
  {
    icon: Brain,
    title: 'AI-Powered Routing',
    description: 'Machine learning algorithms optimize delivery paths in real-time, reducing costs by up to 40%.',
    color: 'from-cyan-500 to-blue-400',
    span: 'col-span-1',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Track delivery rates, latency, and costs across every device and carrier with live dashboards.',
    color: 'from-green-500 to-emerald-400',
    span: 'col-span-1 md:col-span-2',
  },
  {
    icon: Globe,
    title: 'Global Coverage',
    description: 'Reach 6 billion phones across 195 countries with automatic carrier detection and failover.',
    color: 'from-orange-500 to-amber-400',
    span: 'col-span-1',
  },
  {
    icon: Smartphone,
    title: 'Device Fleet Management',
    description: 'Monitor hundreds of Android devices from a single dashboard. Health scoring, alerts, and remote management.',
    color: 'from-rose-500 to-pink-400',
    span: 'col-span-1',
  },
] as const

export const AI_FEATURES = [
  {
    icon: Brain,
    title: 'Smart Route Optimization',
    description: 'AI continuously analyzes carrier performance and routes messages through the fastest, most reliable paths.',
  },
  {
    icon: TrendingUp,
    title: 'Predictive Analytics',
    description: 'Forecast message volumes, predict device health issues, and optimize costs before problems occur.',
  },
  {
    icon: Workflow,
    title: 'Automated Workflows',
    description: 'Build intelligent message pipelines with conditional routing, templates, and automated retry logic.',
  },
  {
    icon: Eye,
    title: 'Anomaly Detection',
    description: 'Real-time fraud detection and abuse prevention powered by machine learning models.',
  },
] as const

export const BENEFITS = [
  {
    icon: Gauge,
    title: '99.99% Uptime',
    description: 'Enterprise-grade infrastructure with automatic failover ensures your messages always get through.',
  },
  {
    icon: Clock,
    title: '< 200ms Latency',
    description: 'Edge-optimized delivery network routes messages in under 200 milliseconds on average.',
  },
  {
    icon: Users,
    title: 'Scale Without Limits',
    description: 'From 100 to 100 million messages — our infrastructure scales seamlessly with your growth.',
  },
  {
    icon: Lock,
    title: 'SOC 2 Compliant',
    description: 'Enterprise security certifications, end-to-end encryption, and full audit logging.',
  },
  {
    icon: Layers,
    title: 'Simple API',
    description: 'RESTful APIs and SDKs for every major language. Get started in under 5 minutes.',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    description: 'Webhooks, real-time dashboards, and intelligent alerting keep you informed.',
  },
] as const

export const INTEGRATIONS = [
  { icon: Code, name: 'REST API' },
  { icon: Terminal, name: 'CLI Tool' },
  { icon: Database, name: 'PostgreSQL' },
  { icon: Cloud, name: 'MQTT' },
  { icon: GitBranch, name: 'Webhooks' },
  { icon: Cpu, name: 'Android SDK' },
  { icon: Zap, name: 'Zapier' },
  { icon: Settings, name: 'n8n' },
] as const

export const TESTIMONIALS = [
  {
    quote: 'AeroXe Bee transformed our SMS infrastructure. We went from 15% delivery failures to 99.7% in just one week.',
    author: 'Sarah Chen',
    role: 'CTO, TechFlow Inc.',
    rating: 5,
  },
  {
    quote: 'The AI routing saved us $40K per month while improving delivery speed by 3x. The ROI was immediate.',
    author: 'Marcus Rodriguez',
    role: 'VP Engineering, DataSync',
    rating: 5,
  },
  {
    quote: 'Managing 500 devices used to be a nightmare. Now I have full visibility from a single dashboard.',
    author: 'Anika Patel',
    role: 'DevOps Lead, CloudBase',
    rating: 5,
  },
] as const

export const PRICING_PLANS = [
  {
    name: 'Starter',
    monthlyPrice: 29,
    yearlyPrice: 290,
    description: 'Perfect for small teams getting started',
    features: [
      '10,000 SMS/month',
      '5 device connections',
      'Basic analytics',
      'Email support',
      'Standard routing',
      'API access',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Professional',
    monthlyPrice: 79,
    yearlyPrice: 790,
    description: 'For growing businesses that need more',
    features: [
      '100,000 SMS/month',
      '25 device connections',
      'Advanced analytics & charts',
      'Priority support',
      'AI-powered routing',
      'Custom webhooks',
      'Template management',
      'Team collaboration',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    monthlyPrice: 299,
    yearlyPrice: 2990,
    description: 'For organizations that need it all',
    features: [
      'Unlimited SMS',
      'Unlimited devices',
      'Full analytics suite',
      'Dedicated support',
      'AI routing + optimization',
      'Custom integrations',
      'SSO & RBAC',
      'SLA guarantee',
      'Dedicated infrastructure',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
] as const

export const FAQ_ITEMS = [
  {
    question: 'How does the AI routing work?',
    answer: 'Our machine learning models analyze real-time carrier performance data, delivery success rates, and latency metrics across 200+ carriers to automatically route each message through the optimal path. The system continuously learns and adapts to changing conditions.',
  },
  {
    question: 'Can I migrate from my current SMS provider?',
    answer: 'Absolutely. We provide migration tools and dedicated support to help you switch from Twilio, Vonage, or any other provider. Most migrations are completed within 24 hours with zero downtime.',
  },
  {
    question: 'What Android devices are supported?',
    answer: 'AeroXe Bee works with any Android device running Android 8.0 or later. We support all major manufacturers including Samsung, Google Pixel, OnePlus, and more. Our fleet management dashboard makes it easy to monitor device health.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! We offer a 14-day free trial with 1,000 SMS credits. No credit card required. You get full access to all Professional plan features during the trial.',
  },
  {
    question: 'How does pricing work?',
    answer: 'Plans are based on monthly SMS volume and number of device connections. Overage is billed at competitive per-message rates. Enterprise plans include unlimited everything with custom pricing.',
  },
  {
    question: 'What kind of support do you offer?',
    answer: 'Starter plans include email support with 24-hour response time. Professional plans get priority support with 4-hour response. Enterprise customers receive a dedicated account manager and 24/7 phone support.',
  },
] as const

export const STATS = [
  { value: 2_500_000_000, label: 'Messages Delivered', suffix: '+' },
  { value: 99.99, label: 'Uptime', suffix: '%' },
  { value: 195, label: 'Countries', suffix: '+' },
  { value: 200, label: 'Carrier Partners', suffix: '+' },
] as const

export const COMPARISON_ROWS = [
  { feature: 'AI-Powered Routing', us: true, competitor1: false, competitor2: false },
  { feature: 'Device Fleet Management', us: true, competitor1: false, competitor2: true },
  { feature: 'Real-Time Analytics', us: true, competitor1: true, competitor2: false },
  { feature: 'Sub-200ms Delivery', us: true, competitor1: false, competitor2: false },
  { feature: 'Smart Retry Logic', us: true, competitor1: true, competitor2: false },
  { feature: 'Custom Webhooks', us: true, competitor1: true, competitor2: true },
  { feature: 'Team Collaboration', us: true, competitor1: false, competitor2: false },
  { feature: '99.99% SLA', us: true, competitor1: false, competitor2: false },
] as const
