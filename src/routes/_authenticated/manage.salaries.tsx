import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ClipboardPaste, Pencil, Trash2, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/portal/Primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/hooks/useMe";
import { supabase } from "@/integrations/supabase/client";
import { formatPeso, isAdminRole, isDeveloperRole, type ProfileRecord } from "@/lib/portal";
import {
  DAY_LABELS,
  SALARY_PASTE_EXAMPLE,
  dayDateLabels,
  parseSalaryPaste,
  salaryWeekLabel,
  salaryWeekStart,
  type ParsedSalaryRow,
  type SalaryWeekRecord,
} from "@/lib/salary";

export const Route = createFileRoute("/_authenticated/manage/salaries")({
  head: () => ({
    meta: [
      { title: "Salary Management — Request & Feedback Portal" },
      { name: "description", content: "Update weekly salaries for every employee in USD." },
      { property: "og:title", content: "Salary Management — Request & Feedback Portal" },
      { property: "og:description", content: "Update weekly salaries for every employee in USD." },
    ],
  }),
  component: SalaryManagementPage,
});

const EMPTY_FORM = {
  days: ["", "", "", "", "", "", ""],
  night: "",
  activity: "",
  hiring: "",
  chatter: "",
  deductions_back: "",
  last_week: "",
  deduction: "",
};

function SalaryManagementPage() {
  const { role } = useMe();
  const queryClient = useQueryClient();
  const [week, setWeek] = useState(() => salaryWeekStart(new Date()));
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ProfileRecord | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const people = useQuery({
    queryKey: ["salary-people"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("email");
      if (error) throw error;
      return (data ?? []) as unknown as ProfileRecord[];
    },
  });

  const weeks = useQuery({
    queryKey: ["salary-weeks", "all", week],
    queryFn: async () => {
      const { data, error } = await supabase.from("salary_weeks").select("*").eq("week_start", week);
      if (error) throw error;
      return (data ?? []) as unknown as SalaryWeekRecord[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("delete_salary_week", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Salary record removed");
      void queryClient.invalidateQueries({ queryKey: ["salary-weeks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const byUser = useMemo(() => {
    const map = new Map<string, SalaryWeekRecord>();
    for (const row of weeks.data ?? []) map.set(row.user_id, row);
    return map;
  }, [weeks.data]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (people.data ?? []).filter(
      (p) => !term || p.email.toLowerCase().includes(term) || (p.full_name ?? "").toLowerCase().includes(term),
    );
  }, [people.data, search]);

  if (!isAdminRole(role)) {
    return <EmptyState title="Not available" hint="Only Developers and Admins can manage salaries." />;
  }

  const weekTotal = (weeks.data ?? []).reduce((s, r) => s + Number(r.net_total), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salary Management"
        description="Salary weeks run Thursday to Wednesday. A 3% service fee is applied to every total."
        actions={
          <Button onClick={() => setBulkOpen(true)}>
            <ClipboardPaste className="mr-2 size-4" /> Bulk Salary
          </Button>
        }
      />

      <div className="panel flex flex-wrap items-end gap-4 p-5">
        <div className="min-w-[12rem]">
          <Label htmlFor="week">Week starting (Thursday)</Label>
          <Input
            id="week"
            type="date"
            value={week}
            onChange={(e) => setWeek(salaryWeekStart(new Date(`${e.target.value}T00:00:00`)))}
          />
          <p className="mt-1 text-xs text-muted-foreground">{salaryWeekLabel(week)}</p>
        </div>
        <div className="min-w-[14rem] flex-1">
          <Label htmlFor="search">Search employee</Label>
          <Input
            id="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
          />
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Published this week</p>
          <p className="font-display text-2xl">{formatPeso(weekTotal)}</p>
        </div>
      </div>

      {people.isLoading || weeks.isLoading ? (
        <LoadingState />
      ) : people.isError ? (
        <ErrorState onRetry={() => void people.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No employees found" hint="Try a different search." />
      ) : (
        <div className="panel divide-y divide-border">
          {rows.map((person) => {
            const record = byUser.get(person.id);
            return (
              <div key={person.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{person.full_name ?? person.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {record ? formatPeso(Number(record.net_total)) : "—"}
                  </p>
                  {record ? (
                    <p className="text-xs text-muted-foreground">
                      Gross {formatPeso(Number(record.gross_total))}
                    </p>
                  ) : null}
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditing(person)}>
                  <Pencil className="mr-2 size-3.5" /> {record ? "Edit" : "Set"}
                </Button>
                {record && isDeveloperRole(role) ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete salary record"
                    onClick={() => remove.mutate(record.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {editing ? (
        <EditSalaryDialog
          person={editing}
          week={week}
          existing={byUser.get(editing.id) ?? null}
          onClose={() => setEditing(null)}
        />
      ) : null}

      <BulkSalaryDialog open={bulkOpen} week={week} onOpenChange={setBulkOpen} />
    </div>
  );
}

function EditSalaryDialog({
  person,
  week,
  existing,
  onClose,
}: {
  person: ProfileRecord;
  week: string;
  existing: SalaryWeekRecord | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() =>
    existing
      ? {
          days: [
            existing.day_1,
            existing.day_2,
            existing.day_3,
            existing.day_4,
            existing.day_5,
            existing.day_6,
            existing.day_7,
          ].map((v) => String(Number(v) || "")),
          night: String(Number(existing.night_shift_allowance) || ""),
          activity: String(Number(existing.activity_bonus) || ""),
          hiring: String(Number(existing.hiring_leader_bonus) || ""),
          chatter: String(Number(existing.chatter_bonus) || ""),
          deductions_back: String(Number(existing.deductions_back) || ""),
          last_week: String(Number(existing.last_week_salary) || ""),
          deduction: String(Number(existing.deduction) || ""),
        }
      : { ...EMPTY_FORM, days: [...EMPTY_FORM.days] },
  );
  const [notify, setNotify] = useState(true);
  const labels = dayDateLabels(week);

  const n = (v: string) => (v.trim() === "" ? 0 : Number(v) || 0);
  const gross =
    form.days.reduce((s, v) => s + n(v), 0) +
    n(form.night) +
    n(form.activity) +
    n(form.hiring) +
    n(form.chatter) +
    n(form.deductions_back) +
    n(form.last_week) -
    n(form.deduction);
  const fee = Math.round(gross * 3) / 100;
  const net = Math.round((gross - fee) * 100) / 100;

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("save_salary_week", {
        _user_id: person.id,
        _week_start: week,
        _days: form.days.map(n),
        _night: n(form.night),
        _activity: n(form.activity),
        _hiring: n(form.hiring),
        _chatter: n(form.chatter),
        _deductions_back: n(form.deductions_back),
        _last_week: n(form.last_week),
        _deduction: n(form.deduction),
        _notify: notify,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Salary saved");
      void queryClient.invalidateQueries({ queryKey: ["salary-weeks"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{person.full_name ?? person.email}</DialogTitle>
          <DialogDescription>{salaryWeekLabel(week)} · amounts in USD</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {DAY_LABELS.map((label, i) => (
              <div key={label}>
                <Label htmlFor={`d${i}`}>{labels[i]}</Label>
                <Input
                  id={`d${i}`}
                  inputMode="decimal"
                  value={form.days[i] ?? ""}
                  onChange={(e) =>
                    setForm((f) => {
                      const days = [...f.days];
                      days[i] = e.target.value;
                      return { ...f, days };
                    })
                  }
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["night", "Night shift allowance"],
                ["activity", "Full-time activity bonus"],
                ["hiring", "Hiring leader bonus"],
                ["chatter", "Great chatter bonus"],
                ["deductions_back", "Deductions back"],
                ["last_week", "Last week's salary"],
                ["deduction", "Deduction"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  inputMode="decimal"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross total</span>
              <span>{formatPeso(gross)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service fee (3%)</span>
              <span className="text-destructive">−{formatPeso(fee)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-border pt-1 font-medium">
              <span>Net payout</span>
              <span className="font-display text-base">{formatPeso(net)}</span>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Notify the employee with a link to their Salary page
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Save salary
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkSalaryDialog({
  open,
  week,
  onOpenChange,
}: {
  open: boolean;
  week: string;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [notify, setNotify] = useState(true);
  const parsed = useMemo(() => parseSalaryPaste(text), [text]);

  const save = useMutation({
    mutationFn: async (rows: ParsedSalaryRow[]) => {
      const { data, error } = await supabase.rpc("bulk_save_salary_weeks", {
        _week_start: week,
        _rows: rows.map((r) => ({
          email: r.email,
          days: r.days,
          night: r.night,
          activity: r.activity,
          hiring: r.hiring,
          chatter: r.chatter,
          deductions_back: r.deductions_back,
          last_week: r.last_week,
          deduction: r.deduction,
        })),
        _notify: notify,
      });
      if (error) throw error;
      return data as unknown as { saved: number; missing: string[] };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["salary-weeks"] });
      const missing = result?.missing ?? [];
      toast.success(
        `Saved ${result?.saved ?? 0} salary rows${missing.length ? ` · ${missing.length} email(s) had no account` : ""}`,
      );
      if (missing.length) toast.message("No account yet", { description: missing.join(", ") });
      setText("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mismatches = parsed.rows.filter((r) => !r.matches);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Bulk salary paste</DialogTitle>
          <DialogDescription>
            Paste the weekly salary sheet exactly as it appears in Excel for {salaryWeekLabel(week)}.
            Columns must stay in order: account, the seven days (Thursday → Wednesday), night shift
            allowance, full-time activity bonus, hiring leader bonus, great chatter bonus, deductions
            back, last week's salary, deduction, salary. Deductions are subtracted and a 3% service fee
            is applied to the total.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            className="font-mono text-xs"
            placeholder={SALARY_PASTE_EXAMPLE}
          />

          {parsed.rows.length > 0 ? (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[46rem] text-xs">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Account</th>
                    {dayDateLabels(week).map((l) => (
                      <th key={l} className="px-2 py-2 font-medium">
                        {l}
                      </th>
                    ))}
                    <th className="px-2 py-2 font-medium">Bonuses</th>
                    <th className="px-2 py-2 font-medium">Deduction</th>
                    <th className="px-2 py-2 font-medium">Total</th>
                    <th className="px-2 py-2 font-medium">Fee 3%</th>
                    <th className="px-2 py-2 font-medium">Net</th>
                    <th className="px-2 py-2 font-medium">Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsed.rows.map((r) => (
                    <tr key={r.email} className={r.matches ? "" : "bg-destructive/5"}>
                      <td className="px-3 py-2">{r.email}</td>
                      {r.days.map((d, i) => (
                        <td key={i} className="px-2 py-2">
                          {d || "—"}
                        </td>
                      ))}
                      <td className="px-2 py-2">
                        {r.night + r.activity + r.hiring + r.chatter + r.deductions_back + r.last_week ||
                          "—"}
                      </td>
                      <td className="px-2 py-2">{r.deduction || "—"}</td>
                      <td className="px-2 py-2">{formatPeso(r.computedTotal)}</td>
                      <td className="px-2 py-2 text-destructive">−{formatPeso(r.serviceFee)}</td>
                      <td className="px-2 py-2 font-medium">{formatPeso(r.netTotal)}</td>
                      <td className="px-2 py-2">
                        {r.matches ? (
                          <CheckCircle2 className="size-4 text-primary" />
                        ) : (
                          <span className="inline-flex items-center gap-1 text-destructive">
                            <TriangleAlert className="size-3.5" /> sheet says {r.statedTotal}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {parsed.rows.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {parsed.rows.length} row(s) detected
              {parsed.skipped ? ` · ${parsed.skipped} line(s) skipped (no email found)` : ""}
              {mismatches.length
                ? ` · ${mismatches.length} row(s) do not match the sheet's own Salary column`
                : " · all totals match the sheet"}
            </p>
          ) : null}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Notify everyone with a link to their Salary page
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => save.mutate(parsed.rows)}
            disabled={save.isPending || parsed.rows.length === 0}
          >
            Save {parsed.rows.length || ""} salaries
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
