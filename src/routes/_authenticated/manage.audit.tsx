import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/portal/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMe } from "@/hooks/useMe";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, isDeveloperRole, type AuditLogRecord } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/manage/audit")({
  head: () => ({
    meta: [
      { title: "Audit Logs — Request & Feedback Portal" },
      { name: "description", content: "Immutable record of administrative actions in the portal." },
      { property: "og:title", content: "Audit Logs — Request & Feedback Portal" },
      { property: "og:description", content: "Immutable record of administrative actions in the portal." },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const [search, setSearch] = useState("");
  const { role } = useMe();
  const queryClient = useQueryClient();
  const canDelete = isDeveloperRole(role);
  const query = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as AuditLogRecord[];
    },
  });

  const rows = (query.data ?? []).filter((log) => {
    const term = search.trim().toLowerCase();
    return (
      !term ||
      log.action.toLowerCase().includes(term) ||
      (log.actor_email ?? "").toLowerCase().includes(term) ||
      (log.target_type ?? "").toLowerCase().includes(term)
    );
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("delete_audit_log", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast.success("Entry removed");
    },
    onError: () => toast.error("Could not remove this entry"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Role changes, reviews, deductions and other administrative actions. Entries cannot be edited; only a Developer can purge them."
      />
      <Input
        placeholder="Search action, actor or target"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="sm:max-w-sm"
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No audit entries yet" />
      ) : (
        <div className="panel divide-y divide-border">
          {rows.map((log) => (
            <div key={log.id} className="px-5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-accent">{log.action}</span>
                <span className="text-sm text-muted-foreground">
                  {log.actor_email ?? "system"}
                  {log.actor_role ? ` (${log.actor_role})` : ""}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDateTime(log.created_at)}
                </span>
                {canDelete ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove audit entry"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm("Permanently remove this audit entry?")) remove.mutate(log.id);
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                ) : null}
              </div>
              {log.target_type ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  target: {log.target_type} {log.target_id ?? ""}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
