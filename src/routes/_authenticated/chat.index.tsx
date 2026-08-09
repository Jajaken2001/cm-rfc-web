import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Lock, MessagesSquare } from "lucide-react";

import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/portal/Primitives";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, type AppRole } from "@/lib/portal";
import type { ChatRoomRecord } from "@/lib/site-content";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({
    meta: [
      { title: "Team Chat — Request & Feedback Portal" },
      { name: "description", content: "Private chat rooms for Developers, Admins and Moderators." },
      { property: "og:title", content: "Team Chat — Request & Feedback Portal" },
      { property: "og:description", content: "Private chat rooms for Developers, Admins and Moderators." },
    ],
  }),
  component: ChatRoomsPage,
});

export function useChatRooms() {
  return useQuery({
    queryKey: ["chat-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chat_rooms").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as ChatRoomRecord[];
    },
  });
}

function RoleList({ roles }: { roles: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.map((r) => (
        <StatusBadge key={r} status={r} label={ROLE_LABEL[r as AppRole] ?? r} />
      ))}
    </div>
  );
}

function ChatRoomsPage() {
  const query = useChatRooms();
  const rooms = query.data ?? [];
  const staffRooms = rooms.filter((r) => r.scope === "staff" && r.is_active);
  const futureRooms = rooms.filter((r) => r.scope === "global" || !r.is_active);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team Chat"
        description="Internal rooms for the management team. Each room is limited to the roles listed on it."
      />

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : staffRooms.length === 0 ? (
        <EmptyState title="No rooms available for your role" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {staffRooms.map((room) => (
            <Link
              key={room.id}
              to="/chat/$roomId"
              params={{ roomId: room.id }}
              className="panel flex flex-col gap-3 p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center gap-2">
                <MessagesSquare className="size-4 text-accent" />
                <h2 className="text-lg">{room.name}</h2>
              </div>
              <p className="text-sm text-muted-foreground">{room.description}</p>
              <RoleList roles={room.allowed_roles} />
            </Link>
          ))}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" />
          <h2 className="text-lg">Coming soon — Global chat rooms</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          These company-wide rooms are prepared and ready to deploy for all employees. They stay
          switched off until management launches them.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {futureRooms.map((room) => (
            <div key={room.id} className="panel flex flex-col gap-3 p-5 opacity-70">
              <div className="flex items-center gap-2">
                <Lock className="size-4 text-muted-foreground" />
                <h3 className="text-base">{room.name}</h3>
                <StatusBadge status="draft" label="Not deployed" />
              </div>
              <p className="text-sm text-muted-foreground">{room.description}</p>
              <RoleList roles={room.allowed_roles} />
            </div>
          ))}
          {futureRooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">No planned rooms yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
