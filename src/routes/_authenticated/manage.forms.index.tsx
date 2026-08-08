import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Archive, Plus, Send, Undo2 } from "lucide-react";
import { toast } from "sonner";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge,
} from "@/components/portal/Primitives";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMe } from "@/hooks/useMe";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, type FormRecord } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/manage/forms")({
  head: () => ({
    meta: [
      { title: "Manage Forms — Request & Feedback Portal" },
      { name: "description", content: "Create, publish and archive request and feedback forms." },
      { property: "og:title", content: "Manage Forms — Request & Feedback Portal" },
      { property: "og:description", content: "Create, publish and archive request and feedback forms." },
    ],
  }),
  component: ManageFormsPage,
});

function ManageFormsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { profile } = useMe();
  const [kind, setKind] = useState<"request" | "feedback">("request");

  const query = useQuery({
    queryKey: ["manage-forms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FormRecord[];
    },
  });

  const createForm = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("forms")
        .insert({
          title: kind === "request" ? "Untitled request form" : "Untitled feedback form",
          kind,
          status: "draft",
          fields: [] as never,
          created_by: profile?.id ?? null,
          created_by_email: profile?.email ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["manage-forms"] });
      void navigate({ to: "/manage/forms/$formId", params: { formId: id } });
    },
    onError: () => toast.error("Could not create the form"),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FormRecord["status"] }) => {
      const { error } = await supabase.from("forms").update({ status }).eq("id", id);
      if (error) throw error;
      await supabase.rpc("write_audit", {
        _action: `form_${status}`,
        _target_type: "form",
        _target_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-forms"] });
      queryClient.invalidateQueries({ queryKey: ["published-forms"] });
      toast.success("Form updated");
    },
    onError: () => toast.error("Could not update the form"),
  });

  const rows = (query.data ?? []).filter((f) => f.kind === kind);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forms"
        description="Build the forms employees fill in. Editing a published form creates a new version; existing submissions keep the version they were answered on."
        actions={
          <Button onClick={() => createForm.mutate()} disabled={createForm.isPending}>
            <Plus className="size-4" /> New {kind} form
          </Button>
        }
      />

      <Tabs value={kind} onValueChange={(v) => setKind(v as "request" | "feedback")}>
        <TabsList>
          <TabsTrigger value="request">Request forms</TabsTrigger>
          <TabsTrigger value="feedback">Feedback forms</TabsTrigger>
        </TabsList>
      </Tabs>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title={`No ${kind} forms yet`} hint="Create one to get started." />
      ) : (
        <div className="panel divide-y divide-border">
          {rows.map((form) => (
            <div key={form.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{form.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  v{form.version} · {form.fields.length} field{form.fields.length === 1 ? "" : "s"} ·
                  updated {formatDateTime(form.updated_at)}
                </p>
              </div>
              <StatusBadge status={form.status} />
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/manage/forms/$formId" params={{ formId: form.id }}>
                    Edit
                  </Link>
                </Button>
                {form.status !== "published" ? (
                  <Button
                    size="sm"
                    disabled={form.fields.length === 0 || setStatus.isPending}
                    onClick={() => setStatus.mutate({ id: form.id, status: "published" })}
                  >
                    <Send className="size-3.5" /> Publish
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={setStatus.isPending}
                    onClick={() => setStatus.mutate({ id: form.id, status: "draft" })}
                  >
                    <Undo2 className="size-3.5" /> Unpublish
                  </Button>
                )}
                {form.status !== "archived" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={setStatus.isPending}
                    onClick={() => setStatus.mutate({ id: form.id, status: "archived" })}
                  >
                    <Archive className="size-3.5" /> Archive
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
