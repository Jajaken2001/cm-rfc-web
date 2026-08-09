import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/portal/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMe } from "@/hooks/useMe";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, isAdminRole } from "@/lib/portal";
import type { InviteLinkRecord } from "@/lib/site-content";

export const Route = createFileRoute("/_authenticated/manage/invites")({
  head: () => ({
    meta: [
      { title: "Access Links — Request & Feedback Portal" },
      { name: "description", content: "Generate hashed access links that grant the User role, with expiry and usage limits." },
      { property: "og:title", content: "Access Links — Request & Feedback Portal" },
      { property: "og:description", content: "Generate hashed access links that grant the User role, with expiry and usage limits." },
    ],
  }),
  component: InvitesPage,
});

function inviteUrl(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/join/${code}`;
}

function InvitesPage() {
  const { role } = useMe();
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [generated, setGenerated] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["invite-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invite_links")
        .select("id, label, max_uses, used_count, expires_at, revoked, created_by_email, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InviteLinkRecord[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const uses = maxUses.trim() ? Number(maxUses) : null;
      if (uses !== null && (!Number.isInteger(uses) || uses < 1)) {
        throw new Error("Uses must be a whole number of at least 1");
      }
      const { data, error } = await supabase.rpc("create_invite_link", {
        _label: label.trim() || "Access link",
        _expires_at: expiresAt ? new Date(expiresAt).toISOString() : (null as unknown as string),
        _max_uses: uses as unknown as number,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (code) => {
      setGenerated(code);
      setLabel("");
      setExpiresAt("");
      setMaxUses("");
      void queryClient.invalidateQueries({ queryKey: ["invite-links"] });
      toast.success("Access link generated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not generate the link"),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("revoke_invite_link", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invite-links"] });
      toast.success("Link revoked");
    },
    onError: () => toast.error("Could not revoke this link"),
  });

  if (!isAdminRole(role)) {
    return (
      <div className="space-y-4">
        <PageHeader title="Access Links" />
        <EmptyState title="Admins only" hint="Only Admins and Developers can generate access links." />
      </div>
    );
  }

  function statusOf(link: InviteLinkRecord): { status: string; label: string } {
    if (link.revoked) return { status: "archived", label: "Revoked" };
    if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now())
      return { status: "expired", label: "Expired" };
    if (link.max_uses !== null && link.used_count >= link.max_uses)
      return { status: "expired", label: "Used up" };
    return { status: "published", label: "Active" };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Access Links"
        description="Share a one-click access link. Anyone who signs in through it is authorized immediately and gets the User role — never a staff role."
      />

      <div className="panel space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="invite-label">Label</Label>
            <Input
              id="invite-label"
              value={label}
              maxLength={80}
              placeholder="e.g. New hires — August"
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-expiry">Expires (optional)</Label>
            <Input
              id="invite-expiry"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-uses">Maximum uses (optional)</Label>
            <Input
              id="invite-uses"
              type="number"
              min={1}
              value={maxUses}
              placeholder="Unlimited"
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={() => create.mutate()} disabled={create.isPending} className="gap-2">
          <Link2 className="size-4" /> Generate link
        </Button>

        {generated ? (
          <div className="rounded-md border border-success/40 bg-success/10 p-4">
            <p className="text-sm font-medium">Copy this link now — it is stored hashed and cannot be shown again.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="break-all rounded bg-background px-2 py-1 text-xs">{inviteUrl(generated)}</code>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  void navigator.clipboard.writeText(inviteUrl(generated));
                  toast.success("Link copied");
                }}
              >
                <Copy className="size-3.5" /> Copy
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState title="No access links yet" />
      ) : (
        <div className="panel divide-y divide-border">
          {(query.data ?? []).map((link) => {
            const s = statusOf(link);
            return (
              <div key={link.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{link.label ?? "Access link"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {link.used_count} / {link.max_uses ?? "∞"} uses · expires{" "}
                    {link.expires_at ? formatDateTime(link.expires_at) : "never"} · created by{" "}
                    {link.created_by_email ?? "—"} on {formatDateTime(link.created_at)}
                  </p>
                </div>
                <StatusBadge status={s.status} label={s.label} />
                {!link.revoked ? (
                  <Button variant="ghost" size="sm" onClick={() => revoke.mutate(link.id)}>
                    Revoke
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
