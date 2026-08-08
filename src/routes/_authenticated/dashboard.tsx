import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BellRing,
  ClipboardList,
  MessageSquareQuote,
  Wallet,
  Users,
  FileSpreadsheet,
} from "lucide-react";

import { EmptyState, LoadingState, PageHeader, StatusBadge } from "@/components/portal/Primitives";
import { useMe } from "@/hooks/useMe";
import { supabase } from "@/integrations/supabase/client";
import {
  formatDateTime,
  formatPeso,
  isStaff,
  type NotificationRecord,
  type SubmissionRecord,
} from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Request & Feedback Portal" },
      { name: "description", content: "Your portal overview: requests, updates and records." },
      { property: "og:title", content: "Dashboard — Request & Feedback Portal" },
      { property: "og:description", content: "Your portal overview: requests, updates and records." },
    ],
  }),
  component: DashboardPage,
});

function StatCard({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: typeof Wallet;
  label: string;
  value: string | number;
  to: string;
}) {
  return (
    <Link to={to} className="panel block p-5 transition-colors hover:border-accent/50">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="size-4 text-accent" />
      </div>
      <p className="mt-3 font-display text-3xl">{value}</p>
    </Link>
  );
}

function DashboardPage() {
  const { profile, role } = useMe();
  const staff = isStaff(role);

  const userStats = useQuery({
    queryKey: ["dashboard", "user", profile?.id],
    enabled: !!profile && !staff,
    queryFn: async () => {
      const [subs, notes, deductions] = await Promise.all([
        supabase
          .from("submissions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("notifications")
          .select("*")
          .eq("status", "published")
          .order("publish_at", { ascending: false })
          .limit(3),
        supabase.from("deductions").select("amount"),
      ]);
      if (subs.error) throw subs.error;
      if (notes.error) throw notes.error;
      if (deductions.error) throw deductions.error;
      return {
        submissions: (subs.data ?? []) as unknown as SubmissionRecord[],
        notifications: (notes.data ?? []) as unknown as NotificationRecord[],
        deductionTotal: (deductions.data ?? []).reduce((sum, d) => sum + Number(d.amount), 0),
      };
    },
  });

  const staffStats = useQuery({
    queryKey: ["dashboard", "staff", profile?.id],
    enabled: !!profile && staff,
    queryFn: async () => {
      const [pending, feedback, users, forms, recent] = await Promise.all([
        supabase
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .eq("kind", "request")
          .eq("status", "pending"),
        supabase
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .eq("kind", "feedback")
          .eq("status", "new"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("forms")
          .select("id", { count: "exact", head: true })
          .eq("status", "published"),
        supabase
          .from("submissions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      if (recent.error) throw recent.error;
      return {
        pending: pending.count ?? 0,
        feedback: feedback.count ?? 0,
        users: users.count ?? 0,
        forms: forms.count ?? 0,
        recent: (recent.data ?? []) as unknown as SubmissionRecord[],
      };
    },
  });

  const greeting = profile?.full_name?.split(" ")[0] ?? "there";

  if (staff) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Welcome back, ${greeting}`}
          description="Overview of activity across the portal."
        />
        {staffStats.isLoading ? (
          <LoadingState />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={ClipboardList} label="Pending requests" value={staffStats.data?.pending ?? 0} to="/manage/requests" />
              <StatCard icon={MessageSquareQuote} label="New feedback" value={staffStats.data?.feedback ?? 0} to="/manage/feedback" />
              <StatCard icon={FileSpreadsheet} label="Published forms" value={staffStats.data?.forms ?? 0} to="/manage/forms" />
              <StatCard icon={Users} label="Members" value={staffStats.data?.users ?? 0} to="/manage/users" />
            </div>

            <section className="panel">
              <h2 className="border-b border-border px-5 py-4 text-lg">Latest submissions</h2>
              {(staffStats.data?.recent.length ?? 0) === 0 ? (
                <div className="p-5">
                  <EmptyState title="No submissions yet" />
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {staffStats.data?.recent.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <span className="font-mono text-xs text-muted-foreground">{s.reference}</span>
                      <span className="min-w-0 flex-1 truncate text-sm">{s.form_title}</span>
                      <span className="truncate text-sm text-muted-foreground">{s.user_email}</span>
                      <StatusBadge status={s.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${greeting}`}
        description="Your requests, updates and records at a glance."
      />
      {userStats.isLoading ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={ClipboardList}
              label="My submissions"
              value={userStats.data?.submissions.length ?? 0}
              to="/my-requests"
            />
            <StatCard
              icon={BellRing}
              label="Recent updates"
              value={userStats.data?.notifications.length ?? 0}
              to="/notifications"
            />
            <StatCard
              icon={Wallet}
              label="Total deductions"
              value={formatPeso(userStats.data?.deductionTotal ?? 0)}
              to="/deductions"
            />
          </div>

          <section className="panel">
            <h2 className="border-b border-border px-5 py-4 text-lg">Latest official updates</h2>
            {(userStats.data?.notifications.length ?? 0) === 0 ? (
              <div className="p-5">
                <EmptyState title="No updates published yet" />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {userStats.data?.notifications.map((n) => (
                  <li key={n.id} className="px-5 py-4">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.message}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(n.publish_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel">
            <h2 className="border-b border-border px-5 py-4 text-lg">My recent submissions</h2>
            {(userStats.data?.submissions.length ?? 0) === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="You haven't submitted anything yet"
                  hint="Open Request Forms to send your first request."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {userStats.data?.submissions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <span className="font-mono text-xs text-muted-foreground">{s.reference}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{s.form_title}</span>
                    <StatusBadge status={s.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
