import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/portal/Primitives";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useMe } from "@/hooks/useMe";
import { supabase } from "@/integrations/supabase/client";
import { formatPeso, isAdminRole } from "@/lib/portal";
import { cn } from "@/lib/utils";
import { useMembers } from "@/routes/_authenticated/manage.users";

export const Route = createFileRoute("/_authenticated/manage/bulk-deductions")({
  head: () => ({
    meta: [
      { title: "Bulk Deduction — Request & Feedback Portal" },
      { name: "description", content: "Apply one salary deduction to many employees at once." },
      { property: "og:title", content: "Bulk Deduction — Request & Feedback Portal" },
      {
        property: "og:description",
        content: "Apply one salary deduction to many employees at once.",
      },
    ],
  }),
  component: BulkDeductionsPage,
});

type SortKey = "az" | "za";

function BulkDeductionsPage() {
  const { role } = useMe();
  const queryClient = useQueryClient();
  const members = useMembers();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("az");
  const [selected, setSelected] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notify, setNotify] = useState(true);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = (members.data ?? []).filter(
      (m) =>
        !term ||
        m.email.toLowerCase().includes(term) ||
        (m.full_name ?? "").toLowerCase().includes(term),
    );
    return [...list].sort((a, b) =>
      sort === "az" ? a.email.localeCompare(b.email) : b.email.localeCompare(a.email),
    );
  }, [members.data, search, sort]);

  const apply = useMutation({
    mutationFn: async () => {
      const value = Number(amount);
      if (!selected.length) throw new Error("Select at least one employee");
      if (!Number.isFinite(value) || value <= 0) throw new Error("Enter a valid amount");
      if (!reason.trim()) throw new Error("Enter a reason");
      if (!date) throw new Error("Choose a date");
      for (const userId of selected) {
        const { error } = await supabase.rpc("create_deduction", {
          _user_id: userId,
          _amount: value,
          _reason: reason.trim(),
          _date: date,
          _notify: notify,
        });
        if (error) throw error;
      }
      return selected.length;
    },
    onSuccess: (count) => {
      void queryClient.invalidateQueries({ queryKey: ["manage-deductions"] });
      void queryClient.invalidateQueries({ queryKey: ["deductions"] });
      setSelected([]);
      setAmount("");
      setReason("");
      toast.success(`Deduction applied to ${count} employee${count === 1 ? "" : "s"}`);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not apply the bulk deduction"),
  });

  if (!isAdminRole(role)) {
    return (
      <EmptyState
        title="Not available"
        hint="Only Admins and Developers can record bulk deductions."
      />
    );
  }

  const allShownSelected = rows.length > 0 && rows.every((m) => selected.includes(m.id));
  const total = Number(amount) > 0 ? Number(amount) * selected.length : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Deduction"
        description="Select employees, then apply the same deduction amount and reason to all of them at once."
        actions={
          <Button variant="outline" asChild>
            <Link to="/manage/deductions">
              <ArrowLeft className="size-4" /> Back to deductions
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by email or name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-sm"
        />
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-44" aria-label="Sort employees">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="az">Email A → Z</SelectItem>
            <SelectItem value="za">Email Z → A</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() =>
            setSelected(
              allShownSelected
                ? selected.filter((id) => !rows.some((m) => m.id === id))
                : [...new Set([...selected, ...rows.map((m) => m.id)])],
            )
          }
        >
          <Users className="size-4" /> {allShownSelected ? "Clear shown" : "Select all shown"}
        </Button>
      </div>

      {members.isLoading ? (
        <LoadingState />
      ) : members.isError ? (
        <ErrorState onRetry={() => void members.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No employees match this search" />
      ) : (
        <div className="panel divide-y divide-border">
          {rows.map((m) => {
            const checked = selected.includes(m.id);
            return (
              <label
                key={m.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors",
                  checked && "bg-primary/10",
                )}
              >
                <Checkbox
                  checked={checked}
                  aria-label={`Select ${m.email}`}
                  onCheckedChange={(value) =>
                    setSelected((prev) =>
                      value === true ? [...prev, m.id] : prev.filter((id) => id !== m.id),
                    )
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.full_name ?? m.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
              </label>
            );
          })}
        </div>
      )}

      <section className="panel space-y-4 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg">Deduction details</h2>
          <span className="text-sm text-muted-foreground">
            {selected.length} selected · total {formatPeso(total)}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bulk-amount">Amount per employee</Label>
            <Input
              id="bulk-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulk-date">Date</Label>
            <Input
              id="bulk-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bulk-reason">Reason</Label>
          <Input
            id="bulk-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Shown to every selected employee"
          />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Notify each employee</p>
            <p className="text-sm text-muted-foreground">
              Sends an update to their Notifications page.
            </p>
          </div>
          <Switch checked={notify} onCheckedChange={setNotify} />
        </div>
        <Button disabled={apply.isPending || selected.length === 0} onClick={() => apply.mutate()}>
          {apply.isPending ? "Applying…" : `Apply to ${selected.length} employee(s)`}
        </Button>
      </section>
    </div>
  );
}
