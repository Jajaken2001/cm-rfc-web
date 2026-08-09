import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/portal/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMe } from "@/hooks/useMe";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, isAdminRole } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/manage/moderation")({
  head: () => ({
    meta: [
      { title: "Moderation — Request & Feedback Portal" },
      { name: "description", content: "Review reported chat messages, hide content and record the outcome." },
      { property: "og:title", content: "Moderation — Request & Feedback Portal" },
      { property: "og:description", content: "Review reported chat messages, hide content and record the outcome." },
    ],
  }),
  component: ModerationPage,
});

interface ReportRow {
  id: string;
  message_id: string;
  room_id: string;
  reason: string;
  status: string;
  resolution_note: string | null;
  reported_by_email: string | null;
  resolved_by_email: string | null;
  resolved_at: string | null;
  created_at: string;
  chat_messages: {
    id: string;
    message: string;
    sender_email: string;
    sender_name: string | null;
    is_hidden: boolean;
    created_at: string;
  } | null;
}

function ModerationPage() {
  const { role } = useMe();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("open");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const query = useQuery({
    queryKey: ["moderation-reports"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moderation_reports")
        .select(
          "*, chat_messages(id, message, sender_email, sender_name, is_hidden, created_at)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReportRow[];
    },
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["moderation-reports"] });
  };

  const hide = useMutation({
    mutationFn: async ({ id, hidden, reason }: { id: string; hidden: boolean; reason: string }) => {
      const { error } = await supabase.rpc("moderate_message", {
        _message_id: id,
        _hide: hidden,
        _reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Message updated");
    },
    onError: () => toast.error("Could not update this message"),
  });

  const resolve = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note: string }) => {
      const { error } = await supabase.rpc("resolve_report", { _id: id, _status: status, _note: note });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Report resolved");
    },
    onError: () => toast.error("Could not resolve this report"),
  });

  if (!isAdminRole(role)) {
    return (
      <div className="space-y-4">
        <PageHeader title="Moderation" />
        <EmptyState title="Admins only" hint="Only Admins and Developers can moderate content." />
      </div>
    );
  }

  const rows = (query.data ?? []).filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Moderation"
        description="Reported chat messages. Hide content that breaks the rules and record how the report was handled."
      />

      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-48" aria-label="Filter reports">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="actioned">Actioned</SelectItem>
          <SelectItem value="dismissed">Dismissed</SelectItem>
          <SelectItem value="all">All</SelectItem>
        </SelectContent>
      </Select>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing to moderate" hint="Reported messages will appear here." />
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.id} className="panel space-y-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={r.status === "open" ? "pending" : r.status === "actioned" ? "approved" : "archived"} label={r.status} />
                <span className="text-xs text-muted-foreground">
                  Room {r.room_id} · reported by {r.reported_by_email ?? "—"} ·{" "}
                  {formatDateTime(r.created_at)}
                </span>
              </div>
              <p className="text-sm">
                <span className="font-medium">Reason:</span> {r.reason}
              </p>
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">
                  {r.chat_messages?.sender_name ?? r.chat_messages?.sender_email ?? "Unknown sender"} ·{" "}
                  {formatDateTime(r.chat_messages?.created_at)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{r.chat_messages?.message ?? "Message removed"}</p>
                {r.chat_messages?.is_hidden ? (
                  <p className="mt-2 text-xs text-destructive">Currently hidden from the room.</p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {r.chat_messages ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      hide.mutate({
                        id: r.chat_messages!.id,
                        hidden: !r.chat_messages!.is_hidden,
                        reason: notes[r.id]?.trim() || "Hidden after moderation review",
                      })
                    }
                  >
                    {r.chat_messages.is_hidden ? "Restore message" : "Hide message"}
                  </Button>
                ) : null}
                <Input
                  placeholder="Resolution note (optional)"
                  value={notes[r.id] ?? ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  className="sm:max-w-xs"
                />
                <Button
                  onClick={() => resolve.mutate({ id: r.id, status: "actioned", note: notes[r.id] ?? "" })}
                >
                  Mark actioned
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => resolve.mutate({ id: r.id, status: "dismissed", note: notes[r.id] ?? "" })}
                >
                  Dismiss
                </Button>
              </div>

              {r.resolved_at ? (
                <p className="text-xs text-muted-foreground">
                  Resolved by {r.resolved_by_email ?? "—"} on {formatDateTime(r.resolved_at)}
                  {r.resolution_note ? ` — ${r.resolution_note}` : ""}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
