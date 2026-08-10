import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { MediaEmbeds } from "@/components/portal/MediaEmbeds";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMe } from "@/hooks/useMe";
import { supabase } from "@/integrations/supabase/client";
import { parseMedia } from "@/lib/media";
import { formatDateTime, type NotificationRecord } from "@/lib/portal";

/**
 * Floating announcement modal: shows published updates that ask for an
 * acknowledgement and that the signed-in employee has not confirmed yet.
 */
export function AnnouncementModal() {
  const { profile } = useMe();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const query = useQuery({
    queryKey: ["announcement-modal", profile?.id],
    enabled: !!profile,
    refetchInterval: 120_000,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const [notes, acks] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .eq("status", "published")
          .eq("requires_ack", true)
          .lte("publish_at", nowIso)
          .order("publish_at", { ascending: false }),
        supabase.from("notification_acknowledgements").select("notification_id"),
      ]);
      if (notes.error) throw notes.error;
      if (acks.error) throw acks.error;
      const acked = new Set((acks.data ?? []).map((a) => a.notification_id));
      return ((notes.data ?? []) as unknown as NotificationRecord[]).filter(
        (n) => !acked.has(n.id) && (!n.expires_at || new Date(n.expires_at) > new Date()),
      );
    },
  });

  const pending = useMemo(
    () => (query.data ?? []).filter((n) => !dismissed.includes(n.id)),
    [query.data, dismissed],
  );
  const current = pending[0] ?? null;

  useEffect(() => {
    setOpen(!!current);
  }, [current]);

  const acknowledge = useMutation({
    mutationFn: async (id: string) => {
      if (!profile) throw new Error("missing profile");
      const { error } = await supabase.from("notification_acknowledgements").insert({
        notification_id: id,
        user_id: profile.id,
        user_email: profile.email,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["announcement-modal"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Acknowledged");
    },
    onError: () => toast.error("Could not record your acknowledgement"),
  });

  if (!current) return null;
  const media = parseMedia((current as unknown as { media?: unknown }).media);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setDismissed((prev) => [...prev, current.id]);
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-accent">
            <BellRing className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Official update</span>
          </div>
          <DialogTitle className="text-left">{current.title}</DialogTitle>
          <DialogDescription className="text-left">
            {formatDateTime(current.publish_at)}
            {pending.length > 1 ? ` · ${pending.length - 1} more waiting` : ""}
          </DialogDescription>
        </DialogHeader>

        <p className="whitespace-pre-wrap text-sm leading-relaxed">{current.message}</p>
        <MediaEmbeds items={media} />

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              setDismissed((prev) => [...prev, current.id]);
              setOpen(false);
            }}
          >
            Read later
          </Button>
          <Button
            disabled={acknowledge.isPending}
            className="gap-2"
            onClick={() => acknowledge.mutate(current.id)}
          >
            <CheckCircle2 className="size-4" /> I have read this
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
