import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Crown, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/portal/Primitives";
import { Input } from "@/components/ui/input";
import { useMe } from "@/hooks/useMe";
import { supabase } from "@/integrations/supabase/client";
import { formatPeso } from "@/lib/portal";
import { daysOf, salaryWeekLabel, type SalaryWeekRecord } from "@/lib/salary";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Salary Leaderboard — Request & Feedback Portal" },
      {
        name: "description",
        content: "Weekly salary leaderboard ranked highest to lowest, with the full team salary table.",
      },
      { property: "og:title", content: "Salary Leaderboard — Request & Feedback Portal" },
      {
        property: "og:description",
        content: "Weekly salary leaderboard ranked highest to lowest, with the full team salary table.",
      },
    ],
  }),
  component: LeaderboardPage,
});

interface Person {
  email: string;
  name: string | null;
  row: SalaryWeekRecord | null;
  registered: boolean;
}

function LeaderboardPage() {
  const { profile } = useMe();
  const [week, setWeek] = useState<string>("");
  const [term, setTerm] = useState("");

  const salaryQuery = useQuery({
    queryKey: ["leaderboard", "salary-weeks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salary_weeks")
        .select("*")
        .order("week_start", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as unknown as SalaryWeekRecord[];
    },
  });

  const peopleQuery = useQuery({
    queryKey: ["leaderboard", "people"],
    queryFn: async () => {
      const [profiles, preauth] = await Promise.all([
        supabase.from("profiles").select("email, full_name"),
        supabase.from("preauthorized_emails").select("email"),
      ]);
      if (profiles.error) throw profiles.error;
      return {
        profiles: (profiles.data ?? []) as { email: string; full_name: string | null }[],
        preauth: (preauth.data ?? []) as { email: string }[],
      };
    },
  });

  const weeks = useMemo(() => {
    const set = new Set((salaryQuery.data ?? []).map((r) => r.week_start));
    return [...set].sort((a, b) => (a < b ? 1 : -1));
  }, [salaryQuery.data]);

  const activeWeek = week || weeks[0] || "";

  const people = useMemo<Person[]>(() => {
    const rows = (salaryQuery.data ?? []).filter((r) => r.week_start === activeWeek);
    const byEmail = new Map<string, SalaryWeekRecord>();
    for (const r of rows) byEmail.set(r.user_email.toLowerCase(), r);

    const map = new Map<string, Person>();
    for (const p of peopleQuery.data?.profiles ?? []) {
      const email = p.email.toLowerCase();
      map.set(email, { email, name: p.full_name, row: byEmail.get(email) ?? null, registered: true });
    }
    for (const p of peopleQuery.data?.preauth ?? []) {
      const email = p.email.toLowerCase();
      if (!map.has(email)) map.set(email, { email, name: null, row: byEmail.get(email) ?? null, registered: false });
    }
    for (const [email, row] of byEmail) {
      if (!map.has(email)) map.set(email, { email, name: null, row, registered: false });
    }

    const list = [...map.values()];
    list.sort((a, b) => {
      const an = a.row ? Number(a.row.net_total) : -1;
      const bn = b.row ? Number(b.row.net_total) : -1;
      if (an !== bn) return bn - an;
      return a.email.localeCompare(b.email);
    });
    return list;
  }, [salaryQuery.data, peopleQuery.data, activeWeek]);

  const filtered = people.filter(
    (p) =>
      !term.trim() ||
      p.email.includes(term.trim().toLowerCase()) ||
      (p.name ?? "").toLowerCase().includes(term.trim().toLowerCase()),
  );

  const ranked = people.filter((p) => p.row);
  const rankOf = (email: string) => ranked.findIndex((p) => p.email === email) + 1;
  const totalPaid = ranked.reduce((s, p) => s + Number(p.row!.net_total), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salary Leaderboard"
        description="Everyone's weekly salary, ranked highest to lowest. People who haven't signed in yet are listed by email."
      />

      {salaryQuery.isLoading || peopleQuery.isLoading ? (
        <LoadingState />
      ) : salaryQuery.isError ? (
        <ErrorState onRetry={() => void salaryQuery.refetch()} />
      ) : weeks.length === 0 ? (
        <EmptyState title="No salary weeks yet" hint="The leaderboard appears once a salary week is published." />
      ) : (
        <>
          <div className="panel flex flex-wrap items-end justify-between gap-4 p-5">
            <div className="min-w-[14rem]">
              <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground" htmlFor="week">
                Salary week
              </label>
              <select
                id="week"
                value={activeWeek}
                onChange={(e) => setWeek(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {weeks.map((w) => (
                  <option key={w} value={w}>
                    {salaryWeekLabel(w)}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Team net payout</p>
              <p className="font-display text-2xl">{formatPeso(totalPaid)}</p>
              <p className="text-xs text-muted-foreground">{ranked.length} paid this week</p>
            </div>
          </div>

          {ranked.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {ranked.slice(0, 3).map((p, i) => (
                <div key={p.email} className="panel p-5">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <Crown className={i === 0 ? "size-4 text-accent" : "size-4"} /> Rank {i + 1}
                  </div>
                  <p className="mt-2 truncate text-sm font-medium">{p.name ?? p.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                  <p className="mt-2 font-display text-2xl">{formatPeso(Number(p.row!.net_total))}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="panel overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
              <h2 className="text-base">Team salary table</h2>
              <div className="relative ml-auto w-full max-w-xs">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Search email or name"
                  className="h-9 pl-8"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">#</th>
                    <th className="px-4 py-2">Employee</th>
                    <th className="px-4 py-2 text-right">Days</th>
                    <th className="px-4 py-2 text-right">Gross</th>
                    <th className="px-4 py-2 text-right">Fee (3%)</th>
                    <th className="px-4 py-2 text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const mine = p.email === (profile?.email ?? "").toLowerCase();
                    const rank = p.row ? rankOf(p.email) : null;
                    return (
                      <tr
                        key={p.email}
                        className={`border-t border-border ${mine ? "bg-primary/5" : ""}`}
                      >
                        <td className="px-4 py-2 text-muted-foreground">{rank ?? "—"}</td>
                        <td className="px-4 py-2">
                          <p className="font-medium">
                            {p.name ?? p.email}
                            {mine ? <span className="ml-2 text-xs text-muted-foreground">(you)</span> : null}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.email}
                            {!p.registered ? " · not signed in yet" : ""}
                          </p>
                        </td>
                        {p.row ? (
                          <>
                            <td className="px-4 py-2 text-right">
                              {formatPeso(daysOf(p.row).reduce((s, v) => s + v, 0))}
                            </td>
                            <td className="px-4 py-2 text-right">{formatPeso(Number(p.row.gross_total))}</td>
                            <td className="px-4 py-2 text-right text-destructive">
                              −{formatPeso(Number(p.row.service_fee))}
                            </td>
                            <td className="px-4 py-2 text-right font-display">
                              {formatPeso(Number(p.row.net_total))}
                            </td>
                          </>
                        ) : (
                          <td className="px-4 py-2 text-right text-xs text-muted-foreground" colSpan={4}>
                            No salary recorded for this week
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
