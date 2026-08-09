import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  BellRing,
  ClipboardList,
  FileText,
  LineChart,
  Lock,
  MessageSquareQuote,
  Wallet,
} from "lucide-react";

import { GoogleSignInButton } from "@/components/portal/GoogleSignInButton";
import { PublicShell } from "@/components/portal/PublicShell";

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

const capabilities = [
  { icon: ClipboardList, title: "Submit Requests", body: "Fill in official request forms and send them to the review team." },
  { icon: MessageSquareQuote, title: "Submit Feedback", body: "Share feedback through forms published by your administrators." },
  { icon: BellRing, title: "Read Notifications", body: "Official updates from management, with acknowledgement when required." },
  { icon: LineChart, title: "Track Requests", body: "Follow every request from pending through approved or declined." },
  { icon: Wallet, title: "View Deductions", body: "See your own salary deduction records, organized by week." },
];

const steps = [
  { n: "01", title: "Sign in with Google", body: "Authentication happens entirely through your Google account. There are no portal passwords." },
  { n: "02", title: "Your access is checked", body: "The portal looks up your account. Only accounts authorized by an administrator can continue." },
  { n: "03", title: "Use your dashboard", body: "You land on the workspace matching your assigned role, with only the sections you are permitted to see." },
];

function Landing() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  return (
    <PublicShell>
      <section className="surface-hero text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary-foreground/85">
              <Lock className="size-3.5" /> Private organization portal
            </span>
            <h1 className="mt-5 text-4xl leading-tight sm:text-5xl">
              Requests, feedback and updates in one secure workspace.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-primary-foreground/80">
              This portal is used internally by our organization. Authorized employees sign in with
              their Google account to submit requests, send feedback, read official updates, track
              request status and review their own salary deductions.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <GoogleSignInButton className="w-full sm:w-auto" />
              <p className="text-sm text-primary-foreground/70">
                Only authorized Google accounts can access the portal.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 p-6 backdrop-blur">
            <h2 className="font-display text-lg">What you can do here</h2>
            <ul className="mt-5 space-y-4">
              {capabilities.map((c) => (
                <li key={c.title} className="flex gap-3">
                  <c.icon className="mt-0.5 size-5 shrink-0 text-accent" />
                  <div>
                    <p className="text-sm font-semibold">{c.title}</p>
                    <p className="text-sm text-primary-foreground/70">{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-2xl">How it works</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
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
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-2">
          <div>
            <h2 className="text-2xl">Access is granted, never claimed</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Signing in with Google proves who you are — it does not grant access on its own. An
              administrator must authorize your account and assign your role before the portal will
              show you anything. Roles are stored and enforced on the server, so what you can reach
              never depends on the browser.
            </p>
          </div>
          <div className="panel flex flex-col justify-between gap-5 p-6">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 size-5 text-accent" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Read how your Google account details, submissions, attachments and deduction records
                are handled before you sign in.
              </p>
            </div>
            <Link
              to="/privacy"
              className="inline-flex w-fit items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Read the Privacy Policy
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
