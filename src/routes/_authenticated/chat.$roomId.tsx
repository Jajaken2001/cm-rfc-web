import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, EyeOff, Flag, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/portal/Primitives";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/hooks/useMe";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, formatDateTime, initialsOf, isAdminRole, type AppRole } from "@/lib/portal";
import type { ChatRoomRecord } from "@/lib/site-content";

export const Route = createFileRoute("/_authenticated/chat/$roomId")({
  head: () => ({
    meta: [
      { title: "Chat Room — Request & Feedback Portal" },
      { name: "description", content: "Private team chat room for the management team." },
      { property: "og:title", content: "Chat Room — Request & Feedback Portal" },
      { property: "og:description", content: "Private team chat room for the management team." },
    ],
  }),
  component: ChatRoomPage,
});

interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string | null;
  sender_email: string;
  sender_role: string | null;
  message: string;
  is_hidden: boolean;
  hidden_reason: string | null;
  created_at: string;
}

function ChatRoomPage() {
  const { roomId } = useParams({ from: "/_authenticated/chat/$roomId" });
  const { profile, role } = useMe();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const roomQuery = useQuery({
    queryKey: ["chat-room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("chat_rooms").select("*").eq("id", roomId).maybeSingle();
      if (error) throw error;
      return (data as unknown as ChatRoomRecord) ?? null;
    },
  });

  const messagesQuery = useQuery({
    queryKey: ["chat-messages", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at")
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as Message[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["chat-messages", roomId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messagesQuery.data]);

  const send = useMutation({
    mutationFn: async (text: string) => {
      if (!profile) throw new Error("No profile");
      const { error } = await supabase.from("chat_messages").insert({
        room_id: roomId,
        sender_id: profile.id,
        sender_name: profile.full_name,
        sender_email: profile.email,
        sender_role: role,
        message: text,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft("");
      void queryClient.invalidateQueries({ queryKey: ["chat-messages", roomId] });
    },
    onError: () => toast.error("Message could not be sent"),
  });

  const report = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.rpc("report_message", { _message_id: id, _reason: reason });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Reported to the admins"),
    onError: () => toast.error("Could not report this message"),
  });

  const hide = useMutation({
    mutationFn: async ({ id, hidden }: { id: string; hidden: boolean }) => {
      const { error } = await supabase.rpc("moderate_message", {
        _message_id: id,
        _hide: hidden,
        _reason: hidden ? "Hidden by an administrator" : "",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chat-messages", roomId] });
      toast.success("Message updated");
    },
    onError: () => toast.error("Could not moderate this message"),
  });

  const messages = messagesQuery.data ?? [];
  const canModerate = isAdminRole(role);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild aria-label="Back to rooms">
          <Link to="/chat">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-xl">{roomQuery.data?.name ?? "Room"}</h1>
          <p className="truncate text-sm text-muted-foreground">{roomQuery.data?.description}</p>
        </div>
      </div>

      <div className="panel flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messagesQuery.isLoading ? (
            <LoadingState />
          ) : messagesQuery.isError ? (
            <ErrorState onRetry={() => void messagesQuery.refetch()} />
          ) : messages.length === 0 ? (
            <EmptyState title="No messages yet" hint="Start the conversation below." />
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === profile?.id;
              return (
                <div key={m.id} className="flex gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-[10px] uppercase">
                      {initialsOf(m.sender_name, m.sender_email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {mine ? "You" : m.sender_name ?? m.sender_email}
                      </span>
                      {m.sender_role ? (
                        <StatusBadge
                          status={m.sender_role}
                          label={ROLE_LABEL[m.sender_role as AppRole] ?? m.sender_role}
                        />
                      ) : null}
                      <span className="text-xs text-muted-foreground">{formatDateTime(m.created_at)}</span>
                    </div>
                    {m.is_hidden ? (
                      <p className="mt-1 text-sm italic text-muted-foreground">
                        Message hidden by moderation{m.hidden_reason ? ` — ${m.hidden_reason}` : ""}.
                        {canModerate ? ` Original: “${m.message}”` : ""}
                      </p>
                    ) : (
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{m.message}</p>
                    )}
                    <div className="mt-1 flex gap-3">
                      {!mine ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => report.mutate({ id: m.id, reason: "Reported from chat" })}
                        >
                          <Flag className="size-3" /> Report
                        </button>
                      ) : null}
                      {canModerate ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => hide.mutate({ id: m.id, hidden: !m.is_hidden })}
                        >
                          <EyeOff className="size-3" /> {m.is_hidden ? "Restore" : "Hide"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form
          className="flex items-end gap-2 border-t border-border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const text = draft.trim();
            if (!text) return;
            send.mutate(text.slice(0, 2000));
          }}
        >
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message…"
            rows={2}
            maxLength={2000}
            className="min-h-[56px] flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const text = draft.trim();
                if (text) send.mutate(text.slice(0, 2000));
              }
            }}
          />
          <Button type="submit" size="icon" disabled={send.isPending || !draft.trim()} aria-label="Send">
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
