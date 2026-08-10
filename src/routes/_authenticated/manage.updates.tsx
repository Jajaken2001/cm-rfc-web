import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/hooks/useMe";
import { supabase } from "@/integrations/supabase/client";
import { MEDIA_KINDS, parseMedia, type MediaItem, type MediaKind } from "@/lib/media";
import { formatDateTime, isDeveloperRole, type NotificationRecord } from "@/lib/portal";
import { MediaEmbeds } from "@/components/portal/MediaEmbeds";

export const Route = createFileRoute("/_authenticated/manage/updates")({
  head: () => ({
    meta: [
      { title: "Official Updates — Request & Feedback Portal" },
      { name: "description", content: "Publish official updates and require acknowledgement." },
      { property: "og:title", content: "Official Updates — Request & Feedback Portal" },
      { property: "og:description", content: "Publish official updates and require acknowledgement." },
    ],
  }),
  component: ManageUpdatesPage,
});

interface Draft {
  title: string;
  message: string;
  publishAt: string;
  expiresAt: string;
  repeat: string;
  requiresAck: boolean;
  media: MediaItem[];
}

const EMPTY: Draft = {
  title: "",
  message: "",
  publishAt: "",
  expiresAt: "",
  repeat: "none",
  requiresAck: false,
  media: [],
};

function ManageUpdatesPage() {
  const { profile, role } = useMe();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({ ...EMPTY, media: [] });

  const query = useQuery({
    queryKey: ["manage-notifications"],
    queryFn: async () => {
      const [notes, acks] = await Promise.all([
        supabase.from("notifications").select("*").order("publish_at", { ascending: false }),
        supabase.from("notification_acknowledgements").select("notification_id"),
      ]);
      if (notes.error) throw notes.error;
      if (acks.error) throw acks.error;
      const counts = new Map<string, number>();
      for (const a of acks.data ?? []) {
        counts.set(a.notification_id, (counts.get(a.notification_id) ?? 0) + 1);
      }
      return { notes: (notes.data ?? []) as unknown as NotificationRecord[], counts };
    },
  });

  const publish = useMutation({
    mutationFn: async (status: "draft" | "published") => {
      if (!draft.title.trim() || !draft.message.trim()) throw new Error("incomplete");
      const { error } = await supabase.from("notifications").insert({
        title: draft.title.trim(),
        message: draft.message.trim(),
        status,
        publish_at: draft.publishAt ? new Date(draft.publishAt).toISOString() : new Date().toISOString(),
        expires_at: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null,
        repeat_schedule: draft.repeat,
        requires_ack: draft.requiresAck,
        media: draft.media
          .filter((m) => m.url.trim())
          .map((m) => ({ kind: m.kind, url: m.url.trim(), label: (m.label ?? "").trim() })) as unknown as never,
        created_by: profile?.id ?? null,
        created_by_email: profile?.email ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setOpen(false);
      setDraft({ ...EMPTY, media: [] });
      toast.success("Update saved");
    },
    onError: () => toast.error("Could not save the update", { description: "A title and message are required." }),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "published" | "archived" }) => {
      const { error } = await supabase.from("notifications").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Update changed");
    },
    onError: () => toast.error("Could not change this update"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("delete_notification", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Update removed");
    },
    onError: () => toast.error("Could not remove this update"),
  });

  const canDelete = isDeveloperRole(role);

  const setMedia = (index: number, patch: Partial<MediaItem>) =>
    setDraft((prev) => ({
      ...prev,
      media: prev.media.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Official Updates"
        description="Announcements employees see in their Notifications page."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> New update
          </Button>
        }
      />

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (query.data?.notes.length ?? 0) === 0 ? (
        <EmptyState title="No updates created yet" />
      ) : (
        <div className="panel divide-y divide-border">
          {query.data?.notes.map((note) => (
            <div key={note.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{note.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDateTime(note.publish_at)}
                  {note.repeat_schedule !== "none" ? ` · repeats ${note.repeat_schedule}` : ""}
                  {note.requires_ack
                    ? ` · ${query.data.counts.get(note.id) ?? 0} acknowledged`
                    : ""}
                </p>
              </div>
              <StatusBadge status={note.status} />
              <div className="flex gap-2">
                {note.status !== "published" ? (
                  <Button
                    size="sm"
                    disabled={changeStatus.isPending}
                    onClick={() => changeStatus.mutate({ id: note.id, status: "published" })}
                  >
                    Publish
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={changeStatus.isPending}
                    onClick={() => changeStatus.mutate({ id: note.id, status: "archived" })}
                  >
                    Archive
                  </Button>
                )}
                {canDelete ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${note.title}`}
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Permanently remove "${note.title}"?`)) remove.mutate(note.id);
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New official update</DialogTitle>
            <DialogDescription>
              Published updates appear for every authorized employee.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note-title">Title</Label>
              <Input
                id="note-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note-message">Message</Label>
              <Textarea
                id="note-message"
                rows={5}
                value={draft.message}
                onChange={(e) => setDraft({ ...draft, message: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="note-publish">Publish at</Label>
                <Input
                  id="note-publish"
                  type="datetime-local"
                  value={draft.publishAt}
                  onChange={(e) => setDraft({ ...draft, publishAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note-expires">Expires at</Label>
                <Input
                  id="note-expires"
                  type="datetime-local"
                  value={draft.expiresAt}
                  onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note-repeat">Repeat</Label>
              <Select
                value={draft.repeat}
                onValueChange={(value) => setDraft({ ...draft, repeat: value })}
              >
                <SelectTrigger id="note-repeat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 rounded-md border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Attachments</p>
                  <p className="text-sm text-muted-foreground">
                    Links, pictures and videos are shown embedded inside the update.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      media: [...prev.media, { kind: "link", url: "", label: "" }],
                    }))
                  }
                >
                  <Plus className="size-4" /> Add
                </Button>
              </div>

              {draft.media.map((m, i) => (
                <div key={i} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[7.5rem_1fr_auto]">
                  <Select value={m.kind} onValueChange={(v) => setMedia(i, { kind: v as MediaKind })}>
                    <SelectTrigger aria-label={`Attachment ${i + 1} type`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDIA_KINDS.map((k) => (
                        <SelectItem key={k.value} value={k.value}>
                          {k.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="space-y-2">
                    <Input
                      aria-label={`Attachment ${i + 1} URL`}
                      placeholder="https://…"
                      value={m.url}
                      onChange={(e) => setMedia(i, { url: e.target.value })}
                    />
                    <Input
                      aria-label={`Attachment ${i + 1} caption`}
                      placeholder="Caption (optional)"
                      value={m.label ?? ""}
                      onChange={(e) => setMedia(i, { label: e.target.value })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove attachment ${i + 1}`}
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, media: prev.media.filter((_, j) => j !== i) }))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}

              {draft.media.some((m) => m.url.trim()) ? (
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Preview</p>
                  <MediaEmbeds items={parseMedia(draft.media)} />
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Require acknowledgement</p>
                <p className="text-sm text-muted-foreground">
                  Employees confirm they have read this update.
                </p>
              </div>
              <Switch
                checked={draft.requiresAck}
                onCheckedChange={(checked) => setDraft({ ...draft, requiresAck: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={publish.isPending} onClick={() => publish.mutate("draft")}>
              Save as draft
            </Button>
            <Button disabled={publish.isPending} onClick={() => publish.mutate("published")}>
              {publish.isPending ? "Saving…" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
