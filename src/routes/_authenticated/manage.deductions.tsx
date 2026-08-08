import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { useMembers } from "@/routes/_authenticated/manage.users";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatPeso, weekLabel, type DeductionRecord } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/manage/deductions")({
  head: () => ({
    meta: [
      { title: "Deductions — Request & Feedback Portal" },
      { name: "description", content: "Record and adjust employee salary deductions." },
      { property: "og:title", content: "Deductions — Request & Feedback Portal" },
      { property: "og:description", content: "Record and adjust employee salary deductions." },
    ],
  }),
  component: ManageDeductionsPage,
});

const EMPTY = { userId: "", amount: "", reason: "", date: "", notify: true };

function ManageDeductionsPage() {
  const queryClient = useQueryClient();
  const members = useMembers();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<DeductionRecord | null>(null);

  const query = useQuery({
    queryKey: ["manage-deductions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deductions")
        .select("*")
        .order("applicable_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DeductionRecord[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("create_deduction", {
        _user_id: draft.userId,
        _amount: Number(draft.amount),
        _reason: draft.reason.trim(),
        _date: draft.date,
        _notify: draft.notify,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-deductions"] });
      setOpen(false);
      setDraft({ ...EMPTY });
      toast.success("Deduction recorded");
    },
    onError: () => toast.error("Could not record the deduction", { description: "Check the employee, amount, reason and date." }),
  });

  const adjust = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error("missing");
      const { error } = await supabase.rpc("adjust_deduction", {
        _id: editing.id,
        _amount: Number(editing.amount),
        _reason: editing.reason,
        _date: editing.applicable_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-deductions"] });
      setEditing(null);
      toast.success("Deduction adjusted");
    },
    onError: () => toast.error("Could not adjust the deduction"),
  });

  const rows = query.data ?? [];
  const byWeek = new Map<string, DeductionRecord[]>();
  for (const row of rows) {
    const list = byWeek.get(row.week_start) ?? [];
    list.push(row);
    byWeek.set(row.week_start, list);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deductions"
        description="Salary deductions are grouped by week. Employees only ever see their own records."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Record deduction
          </Button>
        }
      />

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No deductions recorded" />
      ) : (
        [...byWeek.entries()].map(([week, items]) => (
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
                    <p className="truncate text-sm font-medium">{item.user_email}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.reason} · {formatDate(item.applicable_date)}
                    </p>
                  </div>
                  <span className="text-sm font-medium">{formatPeso(Number(item.amount))}</span>
                  <Button variant="outline" size="sm" onClick={() => setEditing({ ...item })}>
                    Adjust
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a deduction</DialogTitle>
            <DialogDescription>
              The employee sees this in their own Deductions page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ded-user">Employee</Label>
              <Select value={draft.userId} onValueChange={(value) => setDraft({ ...draft, userId: value })}>
                <SelectTrigger id="ded-user">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {(members.data ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name ?? m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ded-amount">Amount</Label>
                <Input
                  id="ded-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.amount}
                  onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ded-date">Date</Label>
                <Input
                  id="ded-date"
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ded-reason">Reason</Label>
              <Input
                id="ded-reason"
                value={draft.reason}
                onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Notify the employee</p>
                <p className="text-sm text-muted-foreground">
                  Sends an update to their Notifications page.
                </p>
              </div>
              <Switch
                checked={draft.notify}
                onCheckedChange={(checked) => setDraft({ ...draft, notify: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? "Saving…" : "Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust deduction</DialogTitle>
            <DialogDescription>
              {editing?.user_email}. Every adjustment is recorded in the audit log.
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adj-amount">Amount</Label>
                  <Input
                    id="adj-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editing.amount}
                    onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adj-date">Date</Label>
                  <Input
                    id="adj-date"
                    type="date"
                    value={editing.applicable_date.slice(0, 10)}
                    onChange={(e) => setEditing({ ...editing, applicable_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adj-reason">Reason</Label>
                <Input
                  id="adj-reason"
                  value={editing.reason}
                  onChange={(e) => setEditing({ ...editing, reason: e.target.value })}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button disabled={adjust.isPending} onClick={() => adjust.mutate()}>
              {adjust.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
