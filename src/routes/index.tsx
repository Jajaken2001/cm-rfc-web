import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  ClipboardList,
  FileText,
  LineChart,
  Lock,
  MessageSquareQuote,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

import { GoogleSignInButton } from "@/components/portal/GoogleSignInButton";
import { PublicShell } from "@/components/portal/PublicShell";
import { SiteBanners } from "@/components/portal/SiteBanners";
import { useSession } from "@/hooks/useMe";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_LANDING, parseLanding } from "@/lib/site-content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Request & Feedback Portal — Employee Access" },
      {
        name: "description",
        content:
          "Authorized employees can submit requests and feedback, read official updates, track request status and view their own salary deductions.",
      },
      { property: "og:title", content: "Request & Feedback Portal — Employee Access" },
      {
        property: "og:description",
        content:
          "Private organization portal for requests, feedback, official updates and salary deduction records.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURE_ICONS = [ClipboardList, MessageSquareQuote, BellRing, LineChart, Wallet, FileText];

const steps = [
  {
    n: "01",
    title: "Sign in with Google",
    body: "Authentication happens entirely through your Google account. There are no portal passwords to remember or reset.",
  },
  {
    n: "02",
    title: "Your access is checked",
    body: "The portal looks up your account. Only accounts authorized by an administrator, or invited through an access link, can continue.",
  },
  {
    n: "03",
    title: "Use your workspace",
    body: "You land on the dashboard matching your assigned role, showing only the sections you are permitted to see.",
  },
];

const assurances = [
  "Roles are stored and enforced on the server, never in your browser",
  "Every administrative action is written to an immutable audit log",
  "Attachments are private and served through short-lived signed links",
];

function Landing() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  const content = useQuery({
    queryKey: ["site-content", "landing"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", "landing")
        .maybeSingle();
      if (error) throw error;
      return parseLanding(data?.value);
    },
  });

  useEffect(() => {
    if (loading || !session) return;
    const stored = window.sessionStorage.getItem("portal-post-login-path");
    window.sessionStorage.removeItem("portal-post-login-path");
    if (stored && stored.startsWith("/") && !stored.startsWith("//")) {
      window.location.replace(stored);
      return;
    }
    void navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  const c = content.data ?? DEFAULT_LANDING;

  return (
    <PublicShell className="theme-pink">
      <SiteBanners />

      <section className="surface-hero relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-card/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-primary shadow-sm backdrop-blur sm:text-xs">
              <Lock className="size-3.5 shrink-0" /> {c.eyebrow}
            </span>
            <h1 className="mt-6 text-[2.1rem] leading-[1.08] text-foreground sm:text-5xl lg:text-[3.4rem]">
              {c.headline}
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
              {c.subheadline}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <GoogleSignInButton label={c.primaryCtaLabel} className="w-full sm:w-auto" />
              <Link
                to="/privacy"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary/25 bg-card/70 px-5 py-2.5 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-card sm:w-auto"
              >
                {c.secondaryCtaLabel} <ArrowRight className="size-4" />
              </Link>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{c.footerNote}</p>

            <ul className="mt-8 grid gap-2.5">
              {assurances.map((a) => (
                <li key={a} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  {a}
                </li>
              ))}
            </ul>
          </div>

          <div className="panel relative p-6 sm:p-7">
            <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-primary">
              <Sparkles className="size-4" /> Inside the portal
            </span>
            <h2 className="mt-3 font-display text-xl">{c.featuresTitle}</h2>
            <ul className="mt-6 space-y-4">
              {c.features.map((f, i) => {
                const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length]!;
                return (
                  <li key={`${f.title}-${i}`} className="flex gap-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="size-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{f.title}</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      <section className="surface-soft">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl">How it works</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Three steps from sign-in to your role-specific workspace.
          </p>
          <div className="mt-9 grid gap-4 sm:gap-5 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="panel p-6">
                <span className="font-display text-sm text-primary">{s.n}</span>
                <h3 className="mt-3 text-lg">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-2 md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-primary">
              <ShieldCheck className="size-4" /> Access control
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl">Access is granted, never claimed</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Signing in with Google proves who you are — it does not grant access on its own. An
              administrator authorizes your account and assigns your role, or invites you through a
              single-use access link. Everything you can reach is decided on the server.
            </p>
          </div>
          <div className="panel flex flex-col justify-between gap-5 p-6">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 size-5 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Read how your Google account details, submissions, attachments and deduction records
                are handled before you sign in.
              </p>
            </div>
            <Link
              to="/privacy"
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:w-fit"
            >
              Read the Privacy Policy
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
