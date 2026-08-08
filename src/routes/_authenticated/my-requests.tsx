import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Paperclip } from "lucide-react";

import { AnswerList } from "@/components/portal/FormRenderer";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export const Route = createFileRoute("/_authenticated/my-requests")({
  head: () => ({
    meta: [
      { title: "My Requests — Request & Feedback Portal" },
      { name: "description", content: "Track the status of every request and feedback you submitted." },
      { property: "og:title", content: "My Requests — Request & Feedback Portal" },
      {
        property: "og:description",
        content: "Track the status of every request and feedback you submitted.",
      },
    ],
  }),
  component: MyRequestsPage,
});

export function SubmissionDetailDialog({
  submission,
  onOpenChange,
}: {
  submission: SubmissionRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  async function openAttachment(path: string) {
    const { data } = await supabase.storage.from("attachments").createSignedUrl(path, 120);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <Dialog open={!!submission} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        {submission ? (
          <>
            <DialogHeader>
              <DialogTitle>{submission.form_title}</DialogTitle>
              <DialogDescription>
                {submission.reference} · submitted {formatDateTime(submission.created_at)} · form
                version {submission.form_version}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={submission.status} />
              <span className="text-sm text-muted-foreground">{submission.user_email}</span>
            </div>

            <AnswerList fields={submission.form_snapshot} answers={submission.answers} />

            {submission.attachments.length > 0 ? (
              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-sm font-semibold">Attachments</p>
                {submission.attachments.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => void openAttachment(file.path)}
                    className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                  >
                    <Paperclip className="size-3.5 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {submission.response_note ? (
              <div className="rounded-md border border-border bg-secondary/60 p-4">
                <p className="text-sm font-semibold">Response</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {submission.response_note}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {submission.reviewed_by_email} · {formatDateTime(submission.reviewed_at)}
                </p>
              </div>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function MyRequestsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [active, setActive] = useState<SubmissionRecord | null>(null);

  const query = useQuery({
    queryKey: ["my-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SubmissionRecord[];
    },
  });

  const rows = (query.data ?? []).filter((s) => {
    const matchesStatus = status === "all" || s.status === status;
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      s.reference.toLowerCase().includes(term) ||
      s.form_title.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Requests"
        description="Everything you have submitted, with its current status."
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search by reference or form title"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="new">New feedback</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nothing to show"
          hint="Submissions you send will appear here with their reference number."
        />
      ) : (
        <div className="panel divide-y divide-border">
          {rows.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <span className="font-mono text-xs text-muted-foreground">{s.reference}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.form_title}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(s.created_at)}</p>
              </div>
              <StatusBadge status={s.status} />
              <Button variant="outline" size="sm" onClick={() => setActive(s)}>
                View
              </Button>
            </div>
          ))}
        </div>
      )}

      <SubmissionDetailDialog submission={active} onOpenChange={(open) => !open && setActive(null)} />
    </div>
  );
}
