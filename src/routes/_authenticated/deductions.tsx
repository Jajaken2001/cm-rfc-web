import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/portal/Primitives";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatPeso, weekLabel, type DeductionRecord } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/deductions")({
  head: () => ({
    meta: [
      { title: "My Deductions — Request & Feedback Portal" },
      { name: "description", content: "Your own salary deduction records, grouped by week." },
      { property: "og:title", content: "My Deductions — Request & Feedback Portal" },
      { property: "og:description", content: "Your own salary deduction records, grouped by week." },
    ],
  }),
  component: DeductionsPage,
});

function DeductionsPage() {
  const query = useQuery({
    queryKey: ["deductions", "mine"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deductions")
        .select("*")
        .order("applicable_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DeductionRecord[];
    },
  });

  const rows = query.data ?? [];
  const total = rows.reduce((sum, d) => sum + Number(d.amount), 0);
  const byWeek = new Map<string, DeductionRecord[]>();
  for (const row of rows) {
    const list = byWeek.get(row.week_start) ?? [];
    list.push(row);
    byWeek.set(row.week_start, list);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Deductions"
        description="Only your own records are shown here. Contact your administrator if something looks wrong."
      />

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No deductions recorded" hint="You have no salary deductions on file." />
      ) : (
        <>
          <div className="panel flex flex-wrap items-baseline justify-between gap-2 p-5">
            <span className="text-sm text-muted-foreground">Total recorded</span>
            <span className="font-display text-3xl">{formatPeso(total)}</span>
          </div>

          {[...byWeek.entries()].map(([week, items]) => (
            <section key={week} className="panel overflow-hidden">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-4">
                <h2 className="text-base">{weekLabel(week)}</h2>
                <span className="text-sm font-medium">
                  {formatPeso(items.reduce((sum, d) => sum + Number(d.amount), 0))}
                </span>
              </div>
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{item.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.applicable_date)}
                      </p>
                    </div>
                    <span className="text-sm font-medium">{formatPeso(Number(item.amount))}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
