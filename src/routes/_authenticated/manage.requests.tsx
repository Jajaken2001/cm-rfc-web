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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, type SubmissionRecord } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/manage/requests")({
  head: () => ({
    meta: [
      { title: "Manage Requests — Request & Feedback Portal" },
      { name: "description", content: "Review, approve or decline employee requests." },
      { property: "og:title", content: "Manage Requests — Request & Feedback Portal" },
      { property: "og:description", content: "Review, approve or decline employee requests." },
    ],
  }),
  component: ManageRequestsPage,
});

function ManageRequestsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [detail, setDetail] = useState<SubmissionRecord | null>(null);
  const [review, setReview] = useState<{ row: SubmissionRecord; decision: "approved" | "declined" } | null>(null);
  const [note, setNote] = useState("");

  const query = useQuery({
    queryKey: ["manage-submissions", "request"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .eq("kind", "request")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SubmissionRecord[];
    },
  });

  const decide = useMutation({
    mutationFn: async () => {
      if (!review) throw new Error("missing");
      const { error } = await supabase.rpc("review_submission", {
        _id: review.row.id,
        _status: review.decision,
        _note: note.trim() || undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(review?.decision === "approved" ? "Request approved" : "Request declined");
      setReview(null);
      setNote("");
    },
    onError: () => toast.error("Could not save the decision"),
  });

  const rows = (query.data ?? []).filter((s) => {
    const matchesStatus = status === "all" || s.status === status;
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      s.reference.toLowerCase().includes(term) ||
      s.form_title.toLowerCase().includes(term) ||
      s.user_email.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requests"
        description="Review submitted requests and record an approval or decline with a response."
      />

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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No requests match this view" />
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
                {row.status === "pending" ? (
                  <>
                    <Button size="sm" onClick={() => setReview({ row, decision: "approved" })}>
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setReview({ row, decision: "declined" })}
                    >
                      Decline
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <SubmissionDetailDialog submission={detail} onOpenChange={(open) => !open && setDetail(null)} />

      <Dialog open={!!review} onOpenChange={(open) => !open && setReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {review?.decision === "approved" ? "Approve request" : "Decline request"}
            </DialogTitle>
            <DialogDescription>
              {review?.row.reference} — {review?.row.user_email}. The employee will see your response.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="response-note">Response note (optional)</Label>
            <Textarea
              id="response-note"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explain the decision so the employee understands it."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReview(null)}>
              Cancel
            </Button>
            <Button
              variant={review?.decision === "declined" ? "destructive" : "default"}
              disabled={decide.isPending}
              onClick={() => decide.mutate()}
            >
              {decide.isPending ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
