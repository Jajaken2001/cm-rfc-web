import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SubmissionDetailDialog } from "@/routes/_authenticated/my-requests";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge,
} from "@/components/portal/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, type SubmissionRecord } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/manage/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback — Request & Feedback Portal" },
      { name: "description", content: "Read employee feedback and mark it as acknowledged." },
      { property: "og:title", content: "Feedback — Request & Feedback Portal" },
      { property: "og:description", content: "Read employee feedback and mark it as acknowledged." },
    ],
  }),
  component: ManageFeedbackPage,
});

function ManageFeedbackPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [detail, setDetail] = useState<SubmissionRecord | null>(null);

  const query = useQuery({
    queryKey: ["manage-submissions", "feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .eq("kind", "feedback")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SubmissionRecord[];
    },
  });

  const acknowledge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("review_submission", {
        _id: id,
        _status: "acknowledged",
        _note: "",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Feedback acknowledged");
    },
    onError: () => toast.error("Could not update this feedback"),
  });

  const rows = (query.data ?? []).filter((s) => {
    const matchesStatus = status === "all" || s.status === status;
    const term = search.trim().toLowerCase();
    return (
      matchesStatus &&
      (!term ||
        s.reference.toLowerCase().includes(term) ||
        s.form_title.toLowerCase().includes(term) ||
        s.user_email.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Feedback" description="Feedback submitted by employees across all forms." />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search reference, form or employee"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-sm"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No feedback matches this view" />
      ) : (
        <div className="panel divide-y divide-border">
          {rows.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <span className="font-mono text-xs text-muted-foreground">{row.reference}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{row.form_title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {row.user_name ?? row.user_email} · {formatDateTime(row.created_at)}
                </p>
              </div>
              <StatusBadge status={row.status} />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setDetail(row)}>
                  View
                </Button>
                {row.status === "new" ? (
                  <Button
                    size="sm"
                    disabled={acknowledge.isPending}
                    onClick={() => acknowledge.mutate(row.id)}
                  >
                    Acknowledge
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <SubmissionDetailDialog submission={detail} onOpenChange={(open) => !open && setDetail(null)} />
    </div>
  );
}
