import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BellRing, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { MediaEmbeds } from "@/components/portal/MediaEmbeds";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/portal/Primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/useMe";
import { supabase } from "@/integrations/supabase/client";
import { parseMedia } from "@/lib/media";
import { formatDateTime, type NotificationRecord } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Request & Feedback Portal" },
      { name: "description", content: "Official updates published by your administrators." },
      { property: "og:title", content: "Notifications — Request & Feedback Portal" },
      { property: "og:description", content: "Official updates published by your administrators." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { profile } = useMe();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", "mine"],
    queryFn: async () => {
      const [notes, acks] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .eq("status", "published")
          .lte("publish_at", new Date().toISOString())
          .order("publish_at", { ascending: false }),
        supabase.from("notification_acknowledgements").select("notification_id"),
      ]);
      if (notes.error) throw notes.error;
      if (acks.error) throw acks.error;
      return {
        notifications: (notes.data ?? []) as unknown as NotificationRecord[],
        acknowledged: new Set((acks.data ?? []).map((a) => a.notification_id)),
      };
    },
  });

  const acknowledge = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!profile) throw new Error("missing profile");
      const { error } = await supabase.from("notification_acknowledgements").insert({
        notification_id: notificationId,
        user_id: profile.id,
        user_email: profile.email,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Acknowledged");
    },
    onError: () => toast.error("Could not record your acknowledgement"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Official updates from management. Some updates ask you to confirm you have read them."
      />

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (query.data?.notifications.length ?? 0) === 0 ? (
        <EmptyState title="No updates yet" hint="Published updates will appear here." />
      ) : (
        <div className="space-y-4">
          {query.data?.notifications.map((note) => {
            const acked = query.data.acknowledged.has(note.id);
            const expired = note.expires_at ? new Date(note.expires_at) < new Date() : false;
            return (
              <article key={note.id} className="panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <BellRing className="mt-0.5 size-4 shrink-0 text-accent" />
                    <div>
                      <h2 className="text-lg">{note.title}</h2>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(note.publish_at)}
                        {note.repeat_schedule !== "none" ? ` · repeats ${note.repeat_schedule}` : ""}
                        {expired ? " · expired" : ""}
                      </p>
                    </div>
                  </div>
                  {note.requires_ack ? (
                    acked ? (
                      <Badge variant="outline" className="border-success/40 bg-success/15 text-success">
                        <CheckCircle2 className="mr-1 size-3.5" /> Acknowledged
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        disabled={acknowledge.isPending}
                        onClick={() => acknowledge.mutate(note.id)}
                      >
                        Acknowledge
                      </Button>
                    )
                  ) : null}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {note.message}
                </p>
                <MediaEmbeds items={parseMedia(note.media)} className="mt-4" />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
