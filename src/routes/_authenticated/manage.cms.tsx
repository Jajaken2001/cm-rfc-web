import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/portal/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/hooks/useMe";
import { supabase } from "@/integrations/supabase/client";
import { isDeveloperRole } from "@/lib/portal";
import { DEFAULT_LANDING, parseLanding, type LandingContent } from "@/lib/site-content";

export const Route = createFileRoute("/_authenticated/manage/cms")({
  head: () => ({
    meta: [
      { title: "Landing Page CMS — Request & Feedback Portal" },
      { name: "description", content: "Edit the public landing page headline, description and feature list." },
      { property: "og:title", content: "Landing Page CMS — Request & Feedback Portal" },
      { property: "og:description", content: "Edit the public landing page headline, description and feature list." },
    ],
  }),
  component: CmsPage,
});

function CmsPage() {
  const { role } = useMe();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<LandingContent>(DEFAULT_LANDING);

  const query = useQuery({
    queryKey: ["site-content", "landing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", "landing")
        .maybeSingle();
      if (error) throw error;
      return parseLanding(data?.value);
    },
  });

  const loaded = query.data;
  useEffect(() => {
    if (loaded) setDraft(loaded);
  }, [loaded]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("site_content")
        .update({ value: draft as unknown as never })
        .eq("key", "landing");
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["site-content", "landing"] });
      toast.success("Landing page updated");
    },
    onError: () => toast.error("Could not save the landing page"),
  });

  if (!isDeveloperRole(role)) {
    return (
      <div className="space-y-4">
        <PageHeader title="Landing Page CMS" />
        <EmptyState title="Developers only" hint="Only Developers can edit the public landing page." />
      </div>
    );
  }

  const set = <K extends keyof LandingContent>(key: K, value: LandingContent[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Landing Page CMS"
        description="Everything here is shown on the public home page. Changes go live as soon as you save."
      />

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (
        <>
          <div className="panel space-y-4 p-5">
            <h2 className="text-lg">Hero</h2>
            <div className="space-y-2">
              <Label htmlFor="cms-eyebrow">Eyebrow</Label>
              <Input id="cms-eyebrow" value={draft.eyebrow} maxLength={80} onChange={(e) => set("eyebrow", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cms-headline">Headline</Label>
              <Input id="cms-headline" value={draft.headline} maxLength={160} onChange={(e) => set("headline", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cms-sub">Subheadline</Label>
              <Textarea id="cms-sub" rows={3} maxLength={600} value={draft.subheadline} onChange={(e) => set("subheadline", e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cms-cta1">Primary button label</Label>
                <Input id="cms-cta1" value={draft.primaryCtaLabel} maxLength={40} onChange={(e) => set("primaryCtaLabel", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cms-cta2">Secondary link label</Label>
                <Input id="cms-cta2" value={draft.secondaryCtaLabel} maxLength={40} onChange={(e) => set("secondaryCtaLabel", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cms-footnote">Note under the sign-in button</Label>
              <Input id="cms-footnote" value={draft.footerNote} maxLength={160} onChange={(e) => set("footerNote", e.target.value)} />
            </div>
          </div>

          <div className="panel space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg">Feature list</h2>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => set("features", [...draft.features, { title: "New item", body: "" }])}
              >
                <Plus className="size-4" /> Add item
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cms-ftitle">Section title</Label>
              <Input id="cms-ftitle" value={draft.featuresTitle} maxLength={80} onChange={(e) => set("featuresTitle", e.target.value)} />
            </div>
            {draft.features.map((f, i) => (
              <div key={i} className="rounded-md border border-border p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-3">
                    <Input
                      aria-label={`Feature ${i + 1} title`}
                      value={f.title}
                      maxLength={80}
                      onChange={(e) =>
                        set(
                          "features",
                          draft.features.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)),
                        )
                      }
                    />
                    <Textarea
                      aria-label={`Feature ${i + 1} description`}
                      rows={2}
                      maxLength={300}
                      value={f.body}
                      onChange={(e) =>
                        set(
                          "features",
                          draft.features.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)),
                        )
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove feature ${i + 1}`}
                    onClick={() => set("features", draft.features.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Save changes
            </Button>
            <Button variant="ghost" onClick={() => setDraft(DEFAULT_LANDING)}>
              Reset to defaults
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
