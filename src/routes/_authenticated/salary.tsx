import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/portal/Primitives";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/useMe";
import { supabase } from "@/integrations/supabase/client";
import { formatPeso } from "@/lib/portal";
import {
  bonusesOf,
  dayDateLabels,
  daysOf,
  salaryWeekLabel,
  type SalaryWeekRecord,
} from "@/lib/salary";

export const Route = createFileRoute("/_authenticated/salary")({
  head: () => ({
    meta: [
      { title: "My Salary — Request & Feedback Portal" },
      {
        name: "description",
        content: "Your weekly salary in USD with a full breakdown of days, bonuses and service fee.",
      },
      { property: "og:title", content: "My Salary — Request & Feedback Portal" },
      {
        property: "og:description",
        content: "Your weekly salary in USD with a full breakdown of days, bonuses and service fee.",
      },
    ],
  }),
  component: SalaryPage,
});

function SalaryPage() {
  const { profile } = useMe();
  const query = useQuery({
    queryKey: ["salary-weeks", "mine", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salary_weeks")
        .select("*")
        .eq("user_id", profile!.id)
        .order("week_start", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? []) as unknown as SalaryWeekRecord[];
    },
  });

  const rows = query.data ?? [];
  const current = rows[0] ?? null;
  const history = rows.slice(1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Salary"
        description="Your salary week runs Thursday to Wednesday. Amounts are in USD and already include the 3% service fee."
      />

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : !current ? (
        <EmptyState
          title="No salary recorded yet"
          hint="Once your weekly salary is published it will appear here with a full breakdown."
        />
      ) : (
        <>
          <SalaryBreakdown row={current} highlight />
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base">Salary history</h2>
              <span className="text-xs text-muted-foreground">Last 25 weeks are kept on file</span>
            </div>
            {history.length === 0 ? (
              <EmptyState title="No earlier weeks yet" hint="Past weeks will be listed here." />
            ) : (
              <div className="space-y-3">
                {history.map((row) => (
                  <HistoryRow key={row.id} row={row} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function HistoryRow({ row }: { row: SalaryWeekRecord }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-medium">{salaryWeekLabel(row.week_start)}</p>
          <p className="text-xs text-muted-foreground">
            Gross {formatPeso(Number(row.gross_total))} · Fee {formatPeso(Number(row.service_fee))}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-display text-lg">{formatPeso(Number(row.net_total))}</span>
          <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide" : "Breakdown"}
          </Button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-border p-5">
          <SalaryBreakdown row={row} bare />
        </div>
      ) : null}
    </div>
  );
}

export function SalaryBreakdown({
  row,
  highlight,
  bare,
}: {
  row: SalaryWeekRecord;
  highlight?: boolean;
  bare?: boolean;
}) {
  const days = daysOf(row);
  const labels = dayDateLabels(row.week_start);
  const bonuses = bonusesOf(row).filter((b) => b.amount !== 0);
  const daysTotal = days.reduce((s, v) => s + v, 0);

  const body = (
    <div className="space-y-5">
      {highlight ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {salaryWeekLabel(row.week_start)}
            </p>
            <p className="font-display text-4xl">{formatPeso(Number(row.net_total))}</p>
            <p className="text-xs text-muted-foreground">Net payout after the 3% service fee</p>
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 text-sm font-medium">Daily earnings</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {days.map((amount, i) => (
            <div key={labels[i]} className="rounded-md border border-border bg-muted/30 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">{labels[i]}</p>
              <p className="text-sm font-medium">{formatPeso(amount)}</p>
            </div>
          ))}
        </div>
      </div>

      <dl className="space-y-2 text-sm">
        <Line label="Days subtotal" value={daysTotal} />
        {bonuses.map((b) => (
          <Line key={b.label} label={b.label} value={b.amount} />
        ))}
        {Number(row.deduction) !== 0 ? (
          <Line label="Deductions" value={-Number(row.deduction)} tone="negative" />
        ) : null}
        <div className="border-t border-border pt-2">
          <Line label="Gross total" value={Number(row.gross_total)} strong />
        </div>
        <Line label="Service fee (3%)" value={-Number(row.service_fee)} tone="negative" />
        <div className="border-t border-border pt-2">
          <Line label="Net payout" value={Number(row.net_total)} strong />
        </div>
      </dl>
    </div>
  );

  if (bare) return body;
  return <section className="panel p-5 sm:p-6">{body}</section>;
}

function Line({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: number;
  strong?: boolean;
  tone?: "negative";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={strong ? "font-medium" : "text-muted-foreground"}>{label}</dt>
      <dd
        className={[
          strong ? "font-display text-base" : "text-sm",
          tone === "negative" ? "text-destructive" : "",
        ].join(" ")}
      >
        {value < 0 ? `−${formatPeso(Math.abs(value))}` : formatPeso(value)}
      </dd>
    </div>
  );
}
