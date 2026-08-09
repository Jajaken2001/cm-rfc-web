export interface LandingFeature {
  title: string;
  body: string;
}

export interface LandingContent {
  eyebrow: string;
  headline: string;
  subheadline: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  featuresTitle: string;
  features: LandingFeature[];
  footerNote: string;
}

export const DEFAULT_LANDING: LandingContent = {
  eyebrow: "Private organization portal",
  headline: "Requests, feedback and updates in one secure workspace.",
  subheadline:
    "Authorized employees sign in with their Google account to submit requests, send feedback, read official updates, track request status and review their own salary deductions.",
  primaryCtaLabel: "Sign in with Google",
  secondaryCtaLabel: "Read the Privacy Policy",
  featuresTitle: "What you can do here",
  features: [
    { title: "Submit Requests", body: "Fill in official request forms and send them to the review team." },
    { title: "Submit Feedback", body: "Share feedback through forms published by your administrators." },
    { title: "Read Notifications", body: "Official updates from management, with acknowledgement when required." },
    { title: "Track Requests", body: "Follow every request from pending through approved or declined." },
    { title: "View Deductions", body: "See your own salary deduction records, organized by week." },
  ],
  footerNote: "Only authorized Google accounts can access the portal.",
};

export function parseLanding(value: unknown): LandingContent {
  const v = (value ?? {}) as Partial<LandingContent>;
  const features = Array.isArray(v.features)
    ? v.features
        .filter((f): f is LandingFeature => !!f && typeof f === "object")
        .map((f) => ({ title: String(f.title ?? ""), body: String(f.body ?? "") }))
    : DEFAULT_LANDING.features;
  return {
    eyebrow: v.eyebrow || DEFAULT_LANDING.eyebrow,
    headline: v.headline || DEFAULT_LANDING.headline,
    subheadline: v.subheadline || DEFAULT_LANDING.subheadline,
    primaryCtaLabel: v.primaryCtaLabel || DEFAULT_LANDING.primaryCtaLabel,
    secondaryCtaLabel: v.secondaryCtaLabel || DEFAULT_LANDING.secondaryCtaLabel,
    featuresTitle: v.featuresTitle || DEFAULT_LANDING.featuresTitle,
    features: features.length ? features : DEFAULT_LANDING.features,
    footerNote: v.footerNote || DEFAULT_LANDING.footerNote,
  };
}

export interface BannerRecord {
  id: string;
  message: string;
  link_url: string | null;
  link_label: string | null;
  variant: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  sort_order: number;
  created_at: string;
}

export const BANNER_VARIANTS = ["info", "success", "warning", "critical"] as const;

export function bannerClasses(variant: string): string {
  switch (variant) {
    case "success":
      return "bg-success/15 text-success border-success/40";
    case "warning":
      return "bg-warning/15 text-warning-foreground border-warning/40";
    case "critical":
      return "bg-destructive/10 text-destructive border-destructive/30";
    default:
      return "bg-info/15 text-info border-info/40";
  }
}

export interface ChatRoomRecord {
  id: string;
  name: string;
  description: string | null;
  allowed_roles: string[];
  scope: string;
  is_active: boolean;
  sort_order: number;
}

export interface InviteLinkRecord {
  id: string;
  label: string | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  revoked: boolean;
  created_by_email: string | null;
  created_at: string;
}
