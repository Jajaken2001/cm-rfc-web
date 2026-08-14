import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, CornerUpLeft, EyeOff, Flag, Paperclip, Send, SmilePlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
      { name: "description", content: "Team chat with attachments, replies and emoji reactions." },
      { property: "og:title", content: "Chat Room — Request & Feedback Portal" },
      { property: "og:description", content: "Team chat with attachments, replies and emoji reactions." },
    ],
  }),
  component: ChatRoomPage,
});

const EMOJIS = ["👍", "❤️", "😂", "🎉", "👀", "🙏"];

interface ChatAttachment {
  path: string;
  name: string;
  size: number;
  type: string;
}

interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string | null;
  sender_email: string;
  sender_role: string | null;
  message: string;
  attachment: ChatAttachment | null;
  reply_to: string | null;
  is_hidden: boolean;
  hidden_reason: string | null;
  created_at: string;
}

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

function ChatRoomPage() {
  const { roomId } = useParams({ from: "/_authenticated/chat/$roomId" });
  const { profile, role } = useMe();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
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

  const reactionsQuery = useQuery({
    queryKey: ["chat-reactions", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("chat_reactions").select("*").eq("room_id", roomId);
      if (error) throw error;
      return (data ?? []) as unknown as Reaction[];
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_reactions", filter: `room_id=eq.${roomId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["chat-reactions", roomId] });
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
    mutationFn: async ({ text, upload }: { text: string; upload: File | null }) => {
      if (!profile) throw new Error("No profile");
      let attachment: ChatAttachment | null = null;
      if (upload) {
        const safe = upload.name.replace(/[^\w.\-]+/g, "_").slice(-80);
        const path = `${profile.id}/chat/${roomId}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage.from("attachments").upload(path, upload);
        if (upErr) throw upErr;
        attachment = { path, name: upload.name, size: upload.size, type: upload.type };
      }
      const { error } = await supabase.from("chat_messages").insert({
        room_id: roomId,
        sender_id: profile.id,
        sender_name: profile.full_name,
        sender_email: profile.email,
        sender_role: role,
        message: text,
        attachment: attachment as never,
        reply_to: replyTo?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft("");
      setFile(null);
      setReplyTo(null);
      if (fileRef.current) fileRef.current.value = "";
      void queryClient.invalidateQueries({ queryKey: ["chat-messages", roomId] });
    },
    onError: (e: Error) => toast.error(e.message || "Message could not be sent"),
  });

  const react = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!profile) throw new Error("No profile");
      const mine = (reactionsQuery.data ?? []).find(
        (r) => r.message_id === messageId && r.emoji === emoji && r.user_id === profile.id,
      );
      if (mine) {
        const { error } = await supabase.from("chat_reactions").delete().eq("id", mine.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("chat_reactions").insert({
          message_id: messageId,
          room_id: roomId,
          user_id: profile.id,
          user_email: profile.email,
          emoji,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["chat-reactions", roomId] }),
    onError: () => toast.error("Could not update the reaction"),
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
  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const reactionsFor = (id: string) => {
    const list = (reactionsQuery.data ?? []).filter((r) => r.message_id === id);
    const grouped = new Map<string, { count: number; mine: boolean }>();
    for (const r of list) {
      const entry = grouped.get(r.emoji) ?? { count: 0, mine: false };
      entry.count += 1;
      if (r.user_id === profile?.id) entry.mine = true;
      grouped.set(r.emoji, entry);
    }
    return [...grouped.entries()];
  };

  function submit() {
    const text = draft.trim();
    if (!text && !file) return;
    send.mutate({ text: text.slice(0, 2000) || (file ? file.name : ""), upload: file });
  }

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
              const parent = m.reply_to ? byId.get(m.reply_to) : null;
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

                    {parent ? (
                      <div className="mt-1 border-l-2 border-border pl-2 text-xs text-muted-foreground">
                        <span className="font-medium">
                          {parent.sender_name ?? parent.sender_email}
                        </span>
                        : <span className="line-clamp-2">{parent.message}</span>
                      </div>
                    ) : null}

                    {m.is_hidden ? (
                      <p className="mt-1 text-sm italic text-muted-foreground">
                        Message hidden by moderation{m.hidden_reason ? ` — ${m.hidden_reason}` : ""}.
                        {canModerate ? ` Original: “${m.message}”` : ""}
                      </p>
                    ) : (
                      <>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{m.message}</p>
                        {m.attachment ? <AttachmentView attachment={m.attachment} /> : null}
                      </>
                    )}

                    {reactionsFor(m.id).length ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {reactionsFor(m.id).map(([emoji, info]) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => react.mutate({ messageId: m.id, emoji })}
                            className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                              info.mine
                                ? "border-primary bg-primary/10"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            {emoji} {info.count}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setReplyTo(m)}
                      >
                        <CornerUpLeft className="size-3" /> Reply
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)}
                        >
                          <SmilePlus className="size-3" /> React
                        </button>
                        {pickerFor === m.id ? (
                          <div className="absolute bottom-6 left-0 z-10 flex gap-1 rounded-md border border-border bg-popover p-1.5 shadow-md">
                            {EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                className="rounded px-1 text-base hover:bg-muted"
                                onClick={() => {
                                  react.mutate({ messageId: m.id, emoji });
                                  setPickerFor(null);
                                }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
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

        <div className="border-t border-border p-4">
          {replyTo ? (
            <div className="mb-2 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs">
              <CornerUpLeft className="size-3 shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                Replying to {replyTo.sender_name ?? replyTo.sender_email}: {replyTo.message}
              </span>
              <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
                <X className="size-3.5" />
              </button>
            </div>
          ) : null}
          {file ? (
            <div className="mb-2 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs">
              <Paperclip className="size-3 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                aria-label="Remove attachment"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : null}

          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Add attachment"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip className="size-4" />
            </Button>
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
                  submit();
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={send.isPending || (!draft.trim() && !file)}
              aria-label="Send"
            >
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function AttachmentView({ attachment }: { attachment: ChatAttachment }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.storage
      .from("attachments")
      .createSignedUrl(attachment.path, 3600)
      .then(({ data }) => {
        if (active) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [attachment.path]);

  if (!url) {
    return <p className="mt-1 text-xs text-muted-foreground">Loading attachment…</p>;
  }

  if (attachment.type.startsWith("image/")) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-2 block max-w-sm">
        <img
          src={url}
          alt={attachment.name}
          loading="lazy"
          className="rounded-md border border-border"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs hover:bg-muted"
    >
      <Paperclip className="size-3.5" /> {attachment.name}
    </a>
  );
}
