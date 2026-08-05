import type { LucideIcon } from "lucide-react";
import {
  BadgeHelp,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileSearch,
  FileText,
  Globe2,
  GraduationCap,
  HandCoins,
  Handshake,
  Headphones,
  LayoutGrid,
  LockKeyhole,
  MapPinned,
  MessageSquareText,
  Mic,
  Package,
  PlugZap,
  ReceiptPoundSterling,
  Route,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Truck,
  University,
  UsersRound,
  WalletCards,
  Waypoints,
  Wrench,
} from "lucide-react";


export type NavItem = {
  label: string;
  href: string;
  description?: string;
};

export type FeatureCard = {
  title: string;
  body: string;
  eyebrow?: string;
  icon?: LucideIcon;
  href?: string;
    cta?: string;
};

export type FooterColumn = {
  title: string;
  links: Array<[string, string]>;
};

export type IndustryRecord = {
  name: string;
  slug: string;
    workflow: string;
  challenges: string[];
  faq: Array<[string, string]>;
};

export type SolutionRecord = {
  slug: "trade-businesses" | "tradespeople" | "customers" | "suppliers";
  title: string;
  eyebrow: string;
  body: string;
    audience: string;
  cta: string;
  cards: FeatureCard[];
};

export type PricingPlan = {
  name: string;
  priceLabel: string;
  billingNote: string;
  idealFor: string;
    features: string[];
  cta: string;
};

export type CampaignRecord = {
  slug: string;
  title: string;
  eyebrow: string;
  body: string;
  painPoints: string[];
  benefits: string[];
  relatedHref: string;
};

export const navItems: NavItem[] = [
  { label: "Platform", href: "/platform", description: "How the connected ecosystem works." },
  { label: "Products", href: "/products", description: "ERP, mobile, AI, payments, marketplace, and more." },
  { label: "Solutions", href: "/solutions", description: "Audience-specific journeys and use cases." },
  { label: "Industries", href: "/industries", description: "Reusable workflows for many trades." },
  { label: "Community", href: "/community", description: "Profiles, groups, jobs, events, and knowledge." },
  { label: "Resources", href: "/resources", description: "Guides, updates, documentation, and status." },
  { label: "Pricing", href: "/pricing", description: "Packages, onboarding, and commercial guidance." },
];

export const megaMenuSections = {
  platform: [
    { label: "Platform Overview", href: "/platform", description: "See the connected operating model." },
    { label: "Connected Workflow", href: "/platform#workflow", description: "Customer request to payment lifecycle." },
    { label: "Automation", href: "/ai", description: "Human-approved AI and automation layers." },
    { label: "AI", href: "/ai", description: "Reception, drafting, reminders, and insights." },
    { label: "Mobile Apps", href: "/mobile", description: "Office-to-field execution experience." },
    { label: "Customer Experience", href: "/solutions/customers", description: "Approvals, documents, and payments." },
    { label: "Supplier Experience", href: "/solutions/suppliers", description: "Price lists, POs, and availability." },
    { label: "Payments", href: "/pricing", description: "Billing and collections pathways." },
    { label: "Integrations", href: "/integrations", description: "Accounting, calendar, maps, storage, API." },
    { label: "Security", href: "/security", description: "Isolation, sessions, permissions, and logs." },
    { label: "API Platform", href: "/integrations", description: "Webhooks, APIs, and trusted access." },
  ],
  products: [
    { label: "Tradesperson ERP", href: "/products/erp", description: "Lead-to-payment command centre.", icon: LayoutGrid },
    { label: "Tradesperson CRM", href: "/products/erp", description: "Leads, customers, sites, and history.", icon: UsersRound },
    { label: "Tradesperson Mobile", href: "/mobile", description: "Field execution for daily work.", icon: Smartphone },
    { label: "Tradesperson AI", href: "/ai", description: "Operational assistant layer.", icon: Bot },
    { label: "Tradesperson Voice", href: "/ai", description: "Missed-call and voice workflow support.", icon: Mic },
    { label: "Tradesperson Payments", href: "/pricing", description: "Invoices, collections, and subscriptions.", icon: WalletCards },
    { label: "Tradesperson Analytics", href: "/products", description: "Reporting, profitability, and trends.", icon: FileSearch },
    { label: "Tradesperson Directory", href: "/directory", description: "Find and be found.", icon: Globe2 },
    { label: "Tradesperson Marketplace", href: "/marketplace", description: "Materials, services, software, offers.", icon: ShoppingBag },
    { label: "Tradesperson Community", href: "/community", description: "Groups, referrals, subcontracting.", icon: Handshake },
    { label: "Tradesperson Academy", href: "/academy", description: "Courses, guides, templates, and webinars.", icon: GraduationCap },
    { label: "Tradesperson API", href: "/integrations", description: "Trusted partner and automation surfaces.", icon: PlugZap },
  ],
  solutions: [
    { label: "Trade Businesses", href: "/solutions/trade-businesses", description: "CRM to profitability across branches." },
    { label: "Tradespeople", href: "/solutions/tradespeople", description: "Field tools for jobs, notes, photos, completion." },
    { label: "Customers", href: "/solutions/customers", description: "Request work, approve, track, pay, review." },
    { label: "Suppliers", href: "/solutions/suppliers", description: "Catalogues, price lists, orders, deliveries." },
  ],
};

export const footerColumns: FooterColumn[] = [
  {
    title: "Platform",
    links: [
      ["Overview", "/platform"],
      ["AI", "/ai"],
      ["Mobile", "/mobile"],
      ["Integrations", "/integrations"],
      ["Security", "/security"],
    ],
  },
  {
    title: "Products",
    links: [
      ["Tradesperson ERP", "/products/erp"],
      ["Directory", "/directory"],
      ["Marketplace", "/marketplace"],
      ["Academy", "/academy"],
      ["Pricing", "/pricing"],
    ],
  },
  {
    title: "Solutions",
    links: [
      ["Trade businesses", "/solutions/trade-businesses"],
      ["Tradespeople", "/solutions/tradespeople"],
      ["Customers", "/solutions/customers"],
      ["Suppliers", "/solutions/suppliers"],
      ["Industries", "/industries"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Contact", "/contact"],
      ["Book demo", "/book-demo"],
      ["Resources", "/resources"],
      ["Sign in", "/sign-in"],
    ],
  },
];

export const workflowSteps = [
  "Customer request",
  "Lead",
  "Estimate",
  "Approval",
  "Scheduling",
  "Field work",
  "Materials",
  "Completion",
  "Invoice",
  "Payment",
  "Review",
  "Future work",
];

export const ecosystemLayers = [
  "ERP",
  "CRM",
  "Mobile",
  "Customer portal",
  "Supplier network",
  "Payments",
  "AI",
  "Community",
];

export const audienceCards: FeatureCard[] = [
  {
    title: "I run a trade business",
    body: "Bring leads, customers, estimates, jobs, teams, materials, invoices, and profitability into one connected operating layer.",
    icon: Building2,
    href: "/solutions/trade-businesses",
    cta: "Explore business workflows",
  },
  {
    title: "I am a tradesperson",
    body: "See today’s jobs, site details, notes, photos, materials, checklists, signatures, and completion steps on the go.",
    icon: Wrench,
    href: "/solutions/tradespeople",
    cta: "See the field experience",
  },
  {
    title: "I need a tradesperson",
    body: "Find a professional, request work, approve quotes, view documents, track appointments, and pay with confidence.",
    icon: UsersRound,
    href: "/solutions/customers",
    cta: "View customer journeys",
  },
  {
    title: "I am a supplier or partner",
    body: "Publish product data, share price lists, receive purchase orders, manage delivery updates, and build ecosystem partnerships.",
    icon: Handshake,
    href: "/solutions/suppliers",
    cta: "Explore supplier workflows",
  },
];

export const productFamily: FeatureCard[] = [
  {
    title: "Tradesperson ERP",
    body: "Run leads, customers, sites, surveys, estimates, quotes, jobs, scheduling, materials, purchasing, finance, and reporting.",
    eyebrow: "Core product",
    icon: LayoutGrid,
    href: "/products/erp",
    cta: "Explore ERP",
  },
  {
    title: "Tradesperson CRM",
    body: "Capture and qualify leads, manage accounts, sites, contacts, and the commercial history around every job.",
    eyebrow: "Revenue layer",
    icon: UsersRound,
    href: "/products/erp",
  },
  {
    title: "Tradesperson Mobile",
    body: "Give field teams a usable job workspace for schedules, site information, notes, photos, checklists, and completion.",
    eyebrow: "Field layer",
    icon: Smartphone,
    href: "/mobile",
  },
  {
    title: "Tradesperson AI",
    body: "Human-approved automation for lead qualification, drafting, reminders, summaries, and operational insights.",
    eyebrow: "Automation",
    icon: Bot,
    href: "/ai",
  },
  {
    title: "Tradesperson Voice",
    body: "Missed-call capture, AI receptionist workflows, and phone-first customer handling power the communications layer.",
    eyebrow: "Communications",
    icon: Mic,
    href: "/ai",
  },
  {
    title: "Tradesperson Payments",
    body: "Support invoice collection, subscription billing, and faster customer payment journeys through connected billing pathways.",
    eyebrow: "Collections",
    icon: CreditCard,
    href: "/pricing",
  },
  {
    title: "Tradesperson Analytics",
    body: "Use profitability, receivables, job performance, and branch visibility to make better operating decisions.",
    eyebrow: "Insights",
    icon: FileSearch,
    href: "/products",
  },
  {
    title: "Tradesperson Directory",
    body: "A discovery layer for professional profiles, locations, quote requests, and trusted trade visibility.",
    eyebrow: "Discovery",
    icon: Globe2,
    href: "/directory",
  },
  {
    title: "Tradesperson Marketplace",
    body: "Connect materials, software, services, insurance, finance, training, and supplier offers in one trade marketplace.",
    eyebrow: "Commerce",
    icon: ShoppingBag,
    href: "/marketplace",
  },
  {
    title: "Tradesperson Community",
    body: "Groups, events, referrals, jobs boards, subcontracting, and local trade conversations are connected network layers.",
    eyebrow: "Network",
    icon: Handshake,
    href: "/community",
  },
  {
    title: "Tradesperson Academy",
    body: "Courses, templates, certifications, product training, and webinars support business growth and skill development.",
    eyebrow: "Learning",
    icon: GraduationCap,
    href: "/academy",
  },
  {
    title: "Tradesperson API",
    body: "Developer and integration access connects trusted partners, webhooks, and advanced automation use cases.",
    eyebrow: "Developers",
    icon: PlugZap,
    href: "/integrations",
  },
];

export const platformCapabilities: FeatureCard[] = [
  { title: "Customer-to-payment workflow", body: "Track work from first enquiry through lead, estimate, quote, job, invoice, payment, and follow-up.", icon: Route },
  { title: "Trade ERP engine", body: "The command centre for CRM, jobs, scheduling, teams, materials, purchasing, finance, documents, and controls.", icon: LayoutGrid },
  { title: "Mobile execution", body: "Connect the office and field with daily jobs, site information, media capture, checklists, and completion.", icon: Smartphone },
  { title: "Customer portal", body: "Approvals, documents, invoices, payments, and customer communication are central to the platform.", icon: Globe2 },
  { title: "Supplier network", body: "Supplier records, product links, price lists, purchase orders, and goods receipts are already part of the ERP foundation.", icon: Store },
  { title: "Payments", body: "Invoice collection and billing readiness connect to real workflows and reliable execution.", icon: CreditCard },
  { title: "Community, marketplace, academy", body: "Learning, discovery, offers, referrals, groups, and trade collaboration expand the platform.", icon: Waypoints },
  { title: "Security and API", body: "Tenant isolation, branch context, permissions, audit logs, signed access, and integration surfaces support safe scale.", icon: ShieldCheck },
];

export const erpModules: FeatureCard[] = [
  { title: "Leads and CRM", body: "Capture enquiries, manage opportunities, customers, contacts, and site history.", icon: UsersRound },
  { title: "Customers and sites", body: "Keep account records, addresses, notes, and branch-specific context tied to the work.", icon: Building2 },
  { title: "Surveys and measurements", body: "Record site visits, survey details, measurements, preparation notes, and estimating inputs.", icon: ClipboardCheck },
  { title: "Estimates and quotes", body: "Build costed work, produce quote-ready outputs, and progress approved opportunities into jobs.", icon: FileText },
  { title: "Jobs and scheduling", body: "Plan work, assign teams, prevent clashes, and keep execution visible across the office and field.", icon: CalendarClock },
  { title: "Materials and inventory", body: "Track products, variants, stock movements, reservations, issues, returns, and availability signals.", icon: Package },
  { title: "Suppliers and procurement", body: "Manage suppliers, contacts, price lists, purchase orders, goods receipts, and supplier-product links.", icon: Truck },
  { title: "Invoices and payments", body: "Create invoices, record payments, monitor receivables, and keep the customer journey connected to cash collection.", icon: ReceiptPoundSterling },
  { title: "Permissions and audit", body: "Use tenant isolation, branch context, secure sessions, role-based access, and audit logging to stay in control.", icon: LockKeyhole },
  { title: "Reports and profitability", body: "Review finance signals, receivables, job-level profitability, and operational visibility in one workspace.", icon: HandCoins },
];

export const industries: IndustryRecord[] = [
  {
    name: "Plumbing",
    slug: "plumbing",
    workflow: "Service jobs, callouts, parts, compliance records, maintenance visits, and customer billing.",
    challenges: ["Urgent callout response", "Parts visibility", "Repeat maintenance scheduling"],
    faq: [["Can plumbing businesses use the core ERP today?", "The core lead-to-payment workflow applies broadly, while plumbing-specific templates are supported natively."]],
  },
  {
    name: "Electrical",
    slug: "electrical",
    workflow: "Installations, inspections, compliance documents, materials control, teams, and sign-off.",
    challenges: ["Certificate handover", "Job safety records", "Inspection scheduling"],
    faq: [["Are compliance workflows live?", "General document and job workflows are available, while trade-specific compliance templates are built in."]],
  },
  {
    name: "HVAC",
    slug: "hvac",
    workflow: "Equipment records, service schedules, parts, recurring maintenance, and engineer dispatch.",
    challenges: ["Asset history", "Recurring maintenance", "Parts and engineer coordination"],
    faq: [["Does this support maintenance contracts?", "Recurring scheduling patterns are built in; core CRM, jobs, and invoices already exist."]],
  },
  {
    name: "Roofing",
    slug: "roofing",
    workflow: "Enquiries, site photos, estimates, teams, materials, staged completion, and payment tracking.",
    challenges: ["Weather-sensitive scheduling", "Photo-heavy surveys", "Materials staging"],
    faq: [["Can roofing teams use mobile capture?", "Field notes, media capture, and completion support the wider field workflow direction."]],
  },
  {
    name: "Flooring",
    slug: "flooring",
    workflow: "Configured workflow for surveys, measurements, products, suppliers, jobs, invoicing, and payments.",
    challenges: ["Room measurement detail", "Product and supplier coordination", "Installer scheduling"],
    faq: [["Why is flooring marked available?", "Flooring is the first deeply configured industry path already reflected in the existing ERP foundation."]],
  },
  {
    name: "Painting and Decorating",
    slug: "painting-decorating",
    workflow: "Site preparation, estimates, teams, materials, room-by-room completion, and staged billing.",
    challenges: ["Room-by-room prep tracking", "Multi-visit scheduling", "Variation control"],
    faq: [["Is room-level workflow possible?", "The platform already supports room and survey structures that can inform broader industry templates."]],
  },
  {
    name: "Carpentry",
    slug: "carpentry",
    workflow: "Custom work, site notes, approvals, workshop-to-site coordination, and staged completion.",
    challenges: ["Custom specification capture", "Material planning", "Stage approvals"],
    faq: [["Can custom jobs be estimated?", "Yes, the estimate and quote engine can support custom commercial workflows with built-in templates."]],
  },
  {
    name: "Joinery",
    slug: "joinery",
    workflow: "Workshop planning, delivery scheduling, installation teams, sign-off, and customer communication.",
    challenges: ["Workshop handoff", "Delivery sequencing", "Installation sign-off"],
    faq: [["Does it support workshop coordination?", "The broader job and materials workflows provide the foundation for this route."]],
  },
  {
    name: "Landscaping",
    slug: "landscaping",
    workflow: "Outdoor projects, visits, teams, materials, machinery, weather planning, and completion updates.",
    challenges: ["Multi-day project visibility", "Crew allocation", "Outdoor logistics"],
    faq: [["Can crews and jobs be scheduled?", "Yes, the scheduling foundation applies broadly across trade operations."]],
  },
  {
    name: "Cleaning",
    slug: "cleaning",
    workflow: "Recurring jobs, teams, checklists, customer communications, and payment collection.",
    challenges: ["Recurring schedules", "Checklist proof", "Service consistency"],
    faq: [["Is recurring work supported?", "General scheduling and job control are present; trade-specific recurrence patterns are supported."]],
  },
  {
    name: "Construction",
    slug: "construction",
    workflow: "Project work, teams, procurement, documents, staged completion, invoicing, and profitability.",
    challenges: ["Multi-stage commercial work", "Procurement visibility", "Margin control"],
    faq: [["Can larger projects fit the model?", "The broader command-centre direction supports connected commercial workflows with scope-aware implementation."]],
  },
  {
    name: "Property Maintenance",
    slug: "property-maintenance",
    workflow: "Reactive jobs, assets, tenants, scheduling, suppliers, field teams, and billing.",
    challenges: ["High job volume", "Communication handoff", "Mixed connected and reactive work"],
    faq: [["Can this support maintenance teams?", "The CRM, jobs, scheduling, and invoicing core already provide the foundation."]],
  },
  {
    name: "Kitchens and Bathrooms",
    slug: "kitchens-bathrooms",
    workflow: "Projects, surveys, product selections, staged work, approvals, suppliers, and customer handover.",
    challenges: ["Selection management", "Stage-based jobs", "Supplier coordination"],
    faq: [["Can selections and suppliers be managed?", "Supplier, catalogue, and estimate workflows already exist and can support this direction."]],
  },
  {
    name: "Facilities Management",
    slug: "facilities-management",
    workflow: "Sites, assets, connected maintenance, suppliers, teams, service records, and reporting.",
    challenges: ["Multi-site visibility", "connected maintenance", "Supplier and SLA coordination"],
    faq: [["Is multi-branch support part of the platform?", "Yes, branch context and role controls are core architecture features."]],
  },
  {
    name: "Fire and Security",
    slug: "fire-security",
    workflow: "Inspections, compliance visits, certificates, parts, scheduled engineers, and customer updates.",
    challenges: ["Certificate outputs", "Site compliance history", "Engineer allocation"],
    faq: [["Are certificates live?", "General document and audit foundations exist; specific certificate outputs are supported."]],
  },
  {
    name: "Solar",
    slug: "solar",
    workflow: "Leads, site surveys, installation scheduling, equipment planning, handover, and payment.",
    challenges: ["Survey-to-install handoff", "Equipment planning", "Customer education"],
    faq: [["Can surveys and install jobs connect?", "Yes, the existing survey, estimate, scheduling, and completion flow supports this direction."]],
  },
  {
    name: "General Contracting",
    slug: "general-contracting",
    workflow: "Commercial workflows, subcontractors, procurement, schedules, billing, and profitability oversight.",
    challenges: ["Commercial coordination", "Subcontractor visibility", "Profitability control"],
    faq: [["Is subcontracting part of the roadmap?", "Community and supplier-network layers support connected trade relationships."]],
  },
];

export const solutionRecords: SolutionRecord[] = [
  {
    slug: "trade-businesses",
    title: "Run your trade business with one connected operating layer.",
    eyebrow: "Solutions for trade businesses",
    body: "Move from scattered tools into one environment for leads, customers, sites, surveys, quotes, jobs, scheduling, materials, invoicing, and profitability.",
    audience: "Owners, office teams, branch managers, coordinators, estimators, and finance teams.",
    cta: "Start a workspace",
    cards: [
      { title: "Leads", body: "Respond faster, qualify consistently, and keep commercial context attached to the work.", icon: UsersRound },
      { title: "Estimates and quotes", body: "Prepare costed work, approvals, and commercial progression into live jobs.", icon: FileText },
      { title: "Scheduling", body: "Balance labour, prevent clashes, and keep branches and teams aligned.", icon: CalendarClock },
      { title: "Materials and purchasing", body: "Control stock, supplier pricing, purchase orders, and receipts close to real jobs.", icon: Package },
      { title: "Invoicing and payments", body: "Issue invoices, record collections, and reduce disconnected finance follow-up.", icon: CreditCard },
      { title: "Profitability", body: "See what work is performing well and where delivery or purchasing is leaking margin.", icon: HandCoins },
    ],
  },
  {
    slug: "tradespeople",
    title: "Give every tradesperson a practical field workspace.",
    eyebrow: "Solutions for tradespeople",
    body: "Make daily jobs clearer with schedules, site information, measurements, notes, media capture, checklists, completion actions, and customer context.",
    audience: "Installers, engineers, technicians, supervisors, and subcontract field teams.",
    cta: "See mobile workflows",
    cards: [
      { title: "Daily jobs", body: "Open today’s work quickly without hunting across messages or calls.", icon: CalendarClock },
      { title: "Site information", body: "Keep addresses, contacts, notes, and job context visible in the field.", icon: MapPinned },
      { title: "Photos and notes", body: "Record proof, progress, issues, and handover detail as the work happens.", icon: Smartphone },
      { title: "Completion", body: "Capture signatures, outstanding items, and job close-out consistently.", icon: ClipboardCheck },
    ],
  },
  {
    slug: "customers",
    title: "Create a cleaner customer journey from request to payment.",
    eyebrow: "Solutions for customers",
    body: "Help customers find the right trade business, share context, approve work, follow progress, receive documents, and pay without friction.",
    audience: "Homeowners, commercial clients, property managers, and facilities teams.",
    cta: "Book a demo",
    cards: [
      { title: "Request work", body: "Share job information, site details, and expectations early.", icon: MessageSquareText },
      { title: "Approve quotes", body: "Move from estimate to approved work with fewer handoffs.", icon: CheckCircle2 },
      { title: "Track jobs", body: "See appointment and document context from a customer-friendly route.", icon: Route },
      { title: "Pay invoices", body: "Keep payment actions connected to the job and document history.", icon: CreditCard },
    ],
  },
  {
    slug: "suppliers",
    title: "Connect suppliers and partners to real trade workflows.",
    eyebrow: "Solutions for suppliers and partners",
    body: "Product data, price lists, purchase orders, delivery updates, offers, training, and marketplace presence belong inside the wider trade network.",
    audience: "Manufacturers, distributors, wholesalers, software partners, finance partners, and service providers.",
    cta: "Explore supplier pathways",
    cards: [
      { title: "Product listings", body: "Prepare structured catalogue and supplier-product data for connected use.", icon: ShoppingBag },
      { title: "Price lists", body: "Manage price-list versions, history, imports, and current supplier pricing.", icon: ReceiptPoundSterling },
      { title: "Purchase orders", body: "Receive structured orders, linked workflows, and delivery expectations.", icon: Truck },
      { title: "Partnerships", body: "Build integrations, marketplace presence, training, and commercial visibility.", icon: Handshake },
    ],
  },
];

export const integrations: FeatureCard[] = [
  { title: "Accounting", body: "Xero, QuickBooks, and Sage are the core finance categories for verified integrations.", icon: ReceiptPoundSterling },
  { title: "Payments", body: "Stripe and GoCardless are the primary billing and collections pathways in scope.", icon: CreditCard },
  { title: "Communication", body: "Email, SMS, WhatsApp, and voice workflows support customer and team coordination.", icon: MessageSquareText },
  { title: "Calendar", body: "Google Calendar and Outlook support scheduling visibility and coordination patterns.", icon: CalendarClock },
  { title: "Maps", body: "Maps and routing layers support address context, travel planning, and field execution.", icon: MapPinned },
  { title: "Storage", body: "S3-compatible file storage powers documents, attachments, and signed access patterns.", icon: Store },
  { title: "Automation", body: "Webhooks, APIs, and workflow connections enable partner and internal automation.", icon: PlugZap },
];

export const businessOutcomes: FeatureCard[] = [
  { title: "Respond to leads faster", body: "Reduce missed opportunities with better enquiry capture and follow-up visibility.", icon: UsersRound },
  { title: "Reduce repetitive admin", body: "Move data through connected workflows instead of duplicating work across tools.", icon: Sparkles },
  { title: "Organise every job", body: "Keep customer, site, team, materials, and finance context in one place.", icon: ClipboardCheck },
  { title: "Prevent scheduling conflicts", body: "Give planners and field teams a cleaner, more controlled operating picture.", icon: CalendarClock },
  { title: "Keep office and field aligned", body: "Reduce handoff gaps between sales, coordination, and job delivery.", icon: Waypoints },
  { title: "Control materials and purchasing", body: "Connect stock, supplier pricing, orders, receipts, and issues to live work.", icon: Package },
  { title: "Improve customer communication", body: "Reduce chasing with clearer requests, approvals, documents, and updates.", icon: MessageSquareText },
  { title: "Get paid faster", body: "Bring invoicing and payment closer to real completion and document context.", icon: WalletCards },
  { title: "Understand profitability", body: "See margin signals and operational leakage earlier.", icon: HandCoins },
  { title: "Grow without losing control", body: "Use roles, branch context, audit logs, and workflow consistency to scale safely.", icon: ShieldCheck },
];

export const trustCards: FeatureCard[] = [
  { title: "Tenant isolation", body: "Customer, job, finance, and product data stay isolated by tenant context.", icon: LockKeyhole },
  { title: "Branch controls", body: "Branch-aware workflows help teams operate with the right local scope.", icon: Building2 },
  { title: "Roles and permissions", body: "Role-based access limits who can view, change, approve, and export sensitive records.", icon: ShieldCheck },
  { title: "Secure sessions", body: "Protected sign-in, session handling, and audited activity support safer access.", icon: Headphones },
  { title: "Audit logging", body: "Operational actions can be traced so teams understand what changed and why.", icon: ClipboardCheck },
  { title: "Backups and status", body: "Backups, storage patterns, and operational status protect your operations.", icon: University },
];

export const pricingPlans: PricingPlan[] = [
  {
    name: "Starter",
    priceLabel: "Pricing available on request",
    billingNote: "For owner-led teams and early-stage operations.",
    idealFor: "Single-branch businesses establishing connected workflows.",
    features: ["ERP access", "Core CRM", "Estimate and quote workflow", "Customer invoicing", "Guided setup"],
    cta: "Book demo",
  },
  {
    name: "Growth",
    priceLabel: "Pricing available on request",
    billingNote: "For growing teams increasing scheduling and operational complexity.",
    idealFor: "Trade businesses adding more field staff, materials, and branch processes.",
    features: ["Everything in Starter", "Mobile access", "Inventory and procurement", "Supplier pricing", "Customer portal direction"],
    cta: "Book demo",
  },
  {
    name: "Multi-Branch",
    priceLabel: "Contact sales",
    billingNote: "For businesses managing multiple teams, branches, and approval layers.",
    idealFor: "Regional operators and multi-site service businesses.",
    features: ["Branch controls", "Advanced permissions", "Operational reporting", "Implementation planning", "Priority onboarding"],
    cta: "Contact sales",
  },
  {
    name: "Enterprise",
    priceLabel: "Contact sales",
    billingNote: "For complex operating environments and partner-aligned implementations.",
    idealFor: "Larger organisations, groups, and bespoke rollout programmes.",
    features: ["Security review", "Deployment planning", "Integration scoping", "Structured onboarding", "Commercial collaboration"],
    cta: "Contact sales",
  },
];

export const pricingComparisonHeaders = ["Capability", "Starter", "Growth", "Multi-Branch", "Enterprise"];
export const pricingComparisonRows = [
  ["ERP access", "Included", "Included", "Included", "Included"],
  ["Mobile access", "Optional", "Included", "Included", "Included"],
  ["Customer portal direction", "connected", "Guided", "Guided", "Guided"],
  ["Inventory and procurement", "Add-on review", "Included", "Included", "Included"],
  ["Reporting", "Core", "Expanded", "Branch-aware", "Solution review"],
  ["Integrations", "Review", "Review", "Scoped", "Scoped"],
  ["AI", "Availability-based", "Availability-based", "Availability-based", "Availability-based"],
  ["Support", "Standard", "Priority", "Priority", "Structured"],
  ["Onboarding", "Guided", "Guided", "Implementation review", "Programme onboarding"],
];

export const resourceCards: FeatureCard[] = [
  { title: "Blog", body: "Editorial insights, product thinking, and trade-operations commentary.", icon: FileText, href: "/resources" },
  { title: "Guides", body: "Playbooks for moving from enquiry to payment with cleaner operational control.", icon: BadgeHelp, href: "/resources" },
  { title: "Templates", body: "Operational templates, forms, checklists, and planning resources.", icon: ClipboardCheck, href: "/resources" },
  { title: "Calculators", body: "Commercial and operational helpers for self-service workflows.", icon: HandCoins, href: "/resources" },
  { title: "Webinars", body: "Training, product walkthroughs, and trade-business operations sessions.", icon: GraduationCap, href: "/academy" },
  { title: "Documentation", body: "Product guidance, implementation notes, and reference materials.", icon: FileSearch, href: "/resources" },
  { title: "Help centre", body: "Support routes, onboarding notes, and service guidance.", icon: Headphones, href: "/resources" },
  { title: "Product updates", body: "Communicate what changed, what is live, and what is still connected.", icon: Sparkles, href: "/resources" },
  { title: "Roadmap", body: "Explain the wider ecosystem direction honestly, without overstating availability.", icon: Waypoints, href: "/products" },
  { title: "Status", body: "Operational readiness and security belong in the public trust layer.", icon: ShieldCheck, href: "/security" },
];

export const communityCards: FeatureCard[] = [
  { title: "Professional profiles", body: "Show trade identity, capability, and future discovery information.", icon: UsersRound },
  { title: "Local groups", body: "Support regional networking and trade-community conversations.", icon: Handshake },
  { title: "Jobs board", body: "Connect opportunities, subcontracting, and specialist demand.", icon: BriefcaseBusiness },
  { title: "Supplier offers", body: "Bring product, service, and partner offers closer to the trade community.", icon: ShoppingBag },
  { title: "Events", body: "Highlight webinars, local events, training, and partner sessions.", icon: CalendarClock },
  { title: "Knowledge sharing", body: "Support guides, proven workflows, and peer learning.", icon: GraduationCap },
];

export const marketplaceCards: FeatureCard[] = [
  { title: "Tools", body: "Connected product discovery for trade operations.", icon: ShoppingBag },
  { title: "Materials", body: "Source products, price lists, and supplier visibility in one trade-focused marketplace.", icon: Package },
  { title: "Software", body: "Support complementary digital tools and partner products.", icon: PlugZap },
  { title: "Insurance and finance", body: "Bring operationally relevant services into the ecosystem.", icon: CreditCard },
  { title: "Training", body: "Link courses, certifications, and skill growth to the platform.", icon: GraduationCap },
  { title: "Trade services", body: "Promote specialist support, logistics, and delivery partners.", icon: Handshake },
];

export const academyCards: FeatureCard[] = [
  { title: "Business courses", body: "Commercial, operational, and systems-focused training for trade businesses.", icon: GraduationCap },
  { title: "Trade learning", body: "Technical and practical education pathways for field teams.", icon: Wrench },
  { title: "Product training", body: "Teach teams how to use connected workflows effectively.", icon: LayoutGrid },
  { title: "Certifications", body: "Structured learning outcomes and proof of progression.", icon: ShieldCheck },
  { title: "Templates and webinars", body: "Reusable resources and live teaching touchpoints.", icon: FileText },
  { title: "Progress tracking", body: "Show training progress and learning engagement over time.", icon: CheckCircle2 },
];

export const faqItems: Array<[string, string]> = [
  ["Is Tradesperson Network only for flooring?", "No. Flooring is the first deeply configured industry workflow, but the brand and platform direction are deliberately universal across the wider trades sector."],
  ["What is live today?", "The ERP foundation is available. Mobile, supplier, customer, AI, marketplace, community, academy, and integration layers are labelled honestly by readiness across the site."],
  ["Can the platform handle multiple branches?", "Yes. Branch context, tenant isolation, role-based access, and audit logging are already part of the architecture."],
  ["How do we start?", "Book a demo or start the workspace onboarding flow, then shape branches, team structure, trade context, and commercial setup around your business."],
];

export const campaignRecords: CampaignRecord[] = [
  {
    slug: "manage-your-trade-business",
    title: "Manage your trade business with one connected operating layer.",
    eyebrow: "Campaign",
    body: "Bring enquiries, jobs, teams, materials, finance, and customer communication into one workflow instead of spreading work across disconnected tools.",
    painPoints: ["Missed lead follow-up", "Fragmented job information", "Admin duplication", "Unclear profitability"],
    benefits: ["Connected CRM to invoice path", "Cleaner team coordination", "Better job context", "Safer operational visibility"],
    relatedHref: "/solutions/trade-businesses",
  },
  {
    slug: "automate-admin",
    title: "Reduce repetitive admin with connected workflows and human-approved automation.",
    eyebrow: "Campaign",
    body: "Focus people on customer service and delivery while AI and system workflows handle repetitive drafting, reminders, and coordination support.",
    painPoints: ["Repeated data entry", "Chasing customers", "Slow updates", "Manual reminders"],
    benefits: ["Cleaner handoffs", "Support for reminders and summaries", "Less context switching", "Better customer response times"],
    relatedHref: "/ai",
  },
  {
    slug: "get-paid-faster",
    title: "Connect job completion to invoicing and payment.",
    eyebrow: "Campaign",
    body: "Bring invoices, payment records, documents, and customer communication closer to real completion events.",
    painPoints: ["Late invoicing", "Payment chasing", "Disconnected documents", "Poor cash visibility"],
    benefits: ["Faster billing readiness", "More consistent collections", "Better customer context", "Clearer receivables tracking"],
    relatedHref: "/pricing",
  },
  {
    slug: "job-management",
    title: "Keep every job visible from first enquiry to final handover.",
    eyebrow: "Campaign",
    body: "Trade businesses need a job record that carries customer, site, team, materials, completion, and finance context all the way through delivery.",
    painPoints: ["Missing job context", "Poor scheduling visibility", "Completion gaps", "Unclear ownership"],
    benefits: ["One job workspace", "Connected scheduling", "Completion support", "Handover clarity"],
    relatedHref: "/products/erp",
  },
  {
    slug: "field-team-software",
    title: "Give field teams a practical workspace instead of message fragments.",
    eyebrow: "Campaign",
    body: "Schedules, site details, notes, media capture, materials, and completion should travel with the job into the field.",
    painPoints: ["Messages replacing systems", "Poor field visibility", "Lost notes and photos", "Weak office-field handoff"],
    benefits: ["Daily job clarity", "Better capture in the field", "Stronger handover", "Office sync"],
    relatedHref: "/mobile",
  },
  {
    slug: "ai-receptionist",
    title: "Capture missed calls and support customer response with AI-ready workflows.",
    eyebrow: "Campaign",
    body: "Voice and AI layers can support trade businesses that lose opportunities when the office is busy or the team is on site.",
    painPoints: ["Missed calls", "Slow follow-up", "Lead drop-off", "Reception bottlenecks"],
    benefits: ["Faster response patterns", "Better lead capture", "Structured call follow-up", "Human-approved automation"],
    relatedHref: "/ai",
  },
  {
    slug: "customer-portal",
    title: "Give customers a cleaner way to approve, track, and pay.",
    eyebrow: "Campaign",
    body: "Customers want clarity, not chasing. Connect requests, approvals, documents, appointments, invoices, and payments in one route.",
    painPoints: ["Approval friction", "Document confusion", "Payment delays", "Weak customer updates"],
    benefits: ["Simpler customer journeys", "Connected records", "Cleaner communication", "Better trust"],
    relatedHref: "/solutions/customers",
  },
  {
    slug: "inventory-and-purchasing",
    title: "Control materials, suppliers, and purchasing closer to the job.",
    eyebrow: "Campaign",
    body: "Stock visibility, supplier pricing, purchase orders, goods receipts, and usage need to stay connected to operations, not run in isolation.",
    painPoints: ["Stock surprises", "Outdated supplier prices", "Disconnected purchasing", "Materials leakage"],
    benefits: ["Closer operational control", "Cleaner supplier workflows", "Purchase visibility", "Better planning"],
    relatedHref: "/solutions/suppliers",
  },
];
