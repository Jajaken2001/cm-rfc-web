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
    <PublicShell>
      <SiteBanners />

      <section className="surface-hero text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-primary-foreground/85 sm:text-xs">
              <Lock className="size-3.5 shrink-0" /> {c.eyebrow}
            </span>
            <h1 className="mt-5 text-[2rem] leading-[1.12] sm:text-5xl lg:text-[3.25rem]">
              {c.headline}
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-primary-foreground/80 sm:text-base">
              {c.subheadline}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <GoogleSignInButton label={c.primaryCtaLabel} className="w-full sm:w-auto" />
              <Link
                to="/privacy"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary-foreground/30 px-4 py-2.5 text-sm font-medium text-primary-foreground/90 transition-colors hover:bg-primary-foreground/10 sm:w-auto"
              >
                {c.secondaryCtaLabel} <ArrowRight className="size-4" />
              </Link>
            </div>
            <p className="mt-3 text-sm text-primary-foreground/70">{c.footerNote}</p>

            <ul className="mt-8 grid gap-2.5 sm:grid-cols-1">
              {assurances.map((a) => (
                <li key={a} className="flex items-start gap-2.5 text-sm text-primary-foreground/75">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
                  {a}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 p-5 backdrop-blur sm:p-6">
            <h2 className="font-display text-lg">{c.featuresTitle}</h2>
            <ul className="mt-5 space-y-4">
              {c.features.map((f, i) => {
                const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length]!;
                return (
                  <li key={`${f.title}-${i}`} className="flex gap-3">
                    <Icon className="mt-0.5 size-5 shrink-0 text-accent" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{f.title}</p>
                      <p className="text-sm leading-relaxed text-primary-foreground/70">{f.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
        <h2 className="text-2xl sm:text-3xl">How it works</h2>
        <div className="mt-8 grid gap-4 sm:gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="panel p-6">
              <span className="font-display text-sm text-accent">{s.n}</span>
              <h3 className="mt-3 text-lg">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-2 md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-accent">
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
              <FileText className="mt-0.5 size-5 shrink-0 text-accent" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Read how your Google account details, submissions, attachments and deduction records
                are handled before you sign in.
              </p>
            </div>
            <Link
              to="/privacy"
              className="inline-flex w-full items-center justify-center rounded-md border border-input px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary sm:w-fit"
            >
              Read the Privacy Policy
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
