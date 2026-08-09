import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/portal/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/hooks/useMe";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, isDeveloperRole } from "@/lib/portal";
import { BANNER_VARIANTS, bannerClasses, type BannerRecord } from "@/lib/site-content";

export const Route = createFileRoute("/_authenticated/manage/banners")({
  head: () => ({
    meta: [
      { title: "Announcement Banners — Request & Feedback Portal" },
      { name: "description", content: "Add, edit and remove the announcement banners shown across the portal." },
      { property: "og:title", content: "Announcement Banners — Request & Feedback Portal" },
      { property: "og:description", content: "Add, edit and remove the announcement banners shown across the portal." },
    ],
  }),
  component: BannersPage,
});

function BannersPage() {
  const { role } = useMe();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [variant, setVariant] = useState<string>("info");
  const [endsAt, setEndsAt] = useState("");

  const query = useQuery({
    queryKey: ["site-banners", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_banners")
        .select("*")
        .order("sort_order")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BannerRecord[];
    },
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["site-banners"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const text = message.trim();
      if (!text) throw new Error("Write the banner message first");
      if (linkUrl.trim() && !/^https?:\/\//i.test(linkUrl.trim())) {
        throw new Error("The link must start with http:// or https://");
      }
      const { error } = await supabase.from("site_banners").insert({
        message: text.slice(0, 300),
        link_url: linkUrl.trim() || null,
        link_label: linkLabel.trim() || null,
        variant,
        is_active: true,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      setLinkUrl("");
      setLinkLabel("");
      setEndsAt("");
      invalidate();
      toast.success("Banner published");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add this banner"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("site_banners").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Banner updated");
    },
    onError: () => toast.error("Could not update this banner"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Banner removed");
    },
    onError: () => toast.error("Could not remove this banner"),
  });

  if (!isDeveloperRole(role)) {
    return (
      <div className="space-y-4">
        <PageHeader title="Announcement Banners" />
        <EmptyState title="Developers only" hint="Only Developers can manage announcement banners." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcement Banners"
        description="Short messages pinned to the top of the portal and the public home page."
      />

      <div className="panel space-y-4 p-5">
        <div className="space-y-2">
          <Label htmlFor="banner-message">Message</Label>
          <Textarea
            id="banner-message"
            rows={2}
            maxLength={300}
            value={message}
            placeholder="e.g. Payroll cut-off moves to Friday this week."
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="banner-variant">Style</Label>
            <Select value={variant} onValueChange={setVariant}>
              <SelectTrigger id="banner-variant">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BANNER_VARIANTS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v[0]!.toUpperCase() + v.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="banner-link">Link URL (optional)</Label>
            <Input id="banner-link" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="banner-link-label">Link label</Label>
            <Input id="banner-link-label" value={linkLabel} maxLength={40} onChange={(e) => setLinkLabel(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="banner-ends">Ends (optional)</Label>
            <Input id="banner-ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
        </div>
        <Button className="gap-2" onClick={() => create.mutate()} disabled={create.isPending}>
          <Plus className="size-4" /> Add banner
        </Button>
      </div>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState title="No banners yet" />
      ) : (
        <div className="space-y-3">
          {(query.data ?? []).map((b) => (
            <div key={b.id} className="panel space-y-3 p-5">
              <div className={`rounded-md border px-4 py-2 text-sm ${bannerClasses(b.variant)}`}>{b.message}</div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={b.is_active ? "published" : "draft"} label={b.is_active ? "Active" : "Hidden"} />
                <span className="text-xs text-muted-foreground">
                  From {formatDateTime(b.starts_at)} · ends {b.ends_at ? formatDateTime(b.ends_at) : "never"}
                  {b.link_url ? ` · links to ${b.link_url}` : ""}
                </span>
                <div className="ml-auto flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      aria-label="Toggle banner"
                      checked={b.is_active}
                      onCheckedChange={(checked) => toggle.mutate({ id: b.id, active: checked })}
                    />
                    <span className="text-xs text-muted-foreground">Visible</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove.mutate(b.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
