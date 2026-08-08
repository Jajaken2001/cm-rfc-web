import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import type { AppRole, ProfileRecord } from "@/lib/portal";

interface SessionState {
  session: Session | null;
  loading: boolean;
}

const SessionContext = createContext<SessionState>({ session: null, loading: true });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next);
      setLoading(false);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        queryClient.invalidateQueries({ queryKey: ["me"] });
      }
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  return <SessionContext.Provider value={{ session, loading }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}

export interface Me {
  profile: ProfileRecord | null;
  role: AppRole | null;
}

/**
 * Bootstraps (or refreshes) the profile row from the verified Firebase-style
 * identity in the auth token, then reads the role assigned in the database.
 * The role is never taken from the client.
 */
export function useMe() {
  const { session, loading } = useSession();
  const userId = session?.user.id ?? null;

  const query = useQuery<Me>({
    queryKey: ["me", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: profile, error } = await supabase.rpc("bootstrap_profile");
      if (error) throw error;
      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!);
      if (roleError) throw roleError;
      const order: AppRole[] = ["developer", "admin", "moderator", "user"];
      const found = order.find((r) => (roles ?? []).some((x) => x.role === r)) ?? null;
      return { profile: (profile as unknown as ProfileRecord) ?? null, role: found };
    },
  });

  // Lightweight presence heartbeat so online/offline is real, not fabricated.
  useEffect(() => {
    if (!userId) return;
    const beat = () => {
      void supabase.rpc("touch_presence");
    };
    beat();
    const id = window.setInterval(beat, 60_000);
    return () => window.clearInterval(id);
  }, [userId]);

  return {
    ...query,
    sessionLoading: loading,
    session,
    profile: query.data?.profile ?? null,
    role: query.data?.role ?? null,
  };
}
