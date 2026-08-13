import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge,
} from "@/components/portal/Primitives";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMe } from "@/hooks/useMe";
import { supabase } from "@/integrations/supabase/client";
import {
  PROTECTED_DEVELOPER_EMAIL,
  ROLE_LABEL,
  formatDateTime,
  initialsOf,
  isAdminRole,
  isDeveloperRole,
  isOnline,
  type AppRole,
  type ProfileRecord,
} from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/manage/users")({
  head: () => ({
    meta: [
      { title: "Users — Request & Feedback Portal" },
      { name: "description", content: "Authorize accounts, review presence and manage member roles." },
      { property: "og:title", content: "Users — Request & Feedback Portal" },
      { property: "og:description", content: "Authorize accounts, review presence and manage member roles." },
    ],
  }),
  component: ManageUsersPage,
});

export interface MemberRow extends ProfileRecord {
  role: AppRole | null;
}

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name", { nullsFirst: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profiles.error) throw profiles.error;
      if (roles.error) throw roles.error;
      const order: AppRole[] = ["developer", "admin", "moderator", "user"];
      return (profiles.data ?? []).map((p) => {
        const owned = (roles.data ?? []).filter((r) => r.user_id === p.id).map((r) => r.role);
        const role = order.find((r) => owned.includes(r)) ?? null;
        return { ...(p as unknown as ProfileRecord), role };
      }) as MemberRow[];
    },
  });
}

function ManageUsersPage() {
  const { role: myRole } = useMe();
  const queryClient = useQueryClient();
  const query = useMembers();
  const [search, setSearch] = useState("");

  const setAuthorization = useMutation({
    mutationFn: async ({ userId, authorized }: { userId: string; authorized: boolean }) => {
      const { error } = await supabase.rpc("set_authorization", {
        _user_id: userId,
        _authorized: authorized,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Access updated");
    },
    onError: () => toast.error("Could not update access"),
  });

  const assignRole = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      const { error } = await supabase.rpc("assign_role", { _email: email, _role: role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Role updated");
    },
    onError: () => toast.error("Could not change this role"),
  });

  const canManageAccess = isAdminRole(myRole);
  const rows = (query.data ?? []).filter((m) => {
    const term = search.trim().toLowerCase();
    return (
      !term ||
      m.email.toLowerCase().includes(term) ||
      (m.full_name ?? "").toLowerCase().includes(term)
    );
  });

  function assignableRoles(target: MemberRow): AppRole[] {
    if (target.email === PROTECTED_DEVELOPER_EMAIL) return [];
    if (isDeveloperRole(myRole)) return ["developer", "admin", "moderator", "user"];
    if (myRole === "admin") return target.role === "developer" ? [] : ["moderator", "user"];
    return [];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Every account that has signed in. Authorize the people who should have access and set their role."
        actions={isDeveloperRole(myRole) ? <PreauthorizedEmailsDialog /> : undefined}
      />

      <Input
        placeholder="Search by name or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="sm:max-w-sm"
      />


      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No members found" />
      ) : (
        <div className="panel divide-y divide-border">
          {rows.map((member) => {
            const options = assignableRoles(member);
            return (
              <div key={member.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <Avatar className="size-9">
                  {member.avatar_url ? <AvatarImage src={member.avatar_url} alt="" /> : null}
                  <AvatarFallback className="text-xs uppercase">
                    {initialsOf(member.full_name, member.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{member.full_name ?? member.email}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.email} · last seen {formatDateTime(member.last_seen_at)}
                  </p>
                </div>
                <StatusBadge status={isOnline(member.last_seen_at) ? "online" : "offline"} />
                <StatusBadge
                  status={member.role ?? "unauthorized"}
                  label={member.role ? ROLE_LABEL[member.role] : "No role"}
                />
                {canManageAccess ? (
                  <div className="flex flex-wrap items-center gap-3">
                    {options.length > 0 ? (
                      <Select
                        value={member.role ?? ""}
                        onValueChange={(value) =>
                          assignRole.mutate({ email: member.email, role: value as AppRole })
                        }
                      >
                        <SelectTrigger className="w-36" aria-label={`Role for ${member.email}`}>
                          <SelectValue placeholder="Set role" />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-muted-foreground">Protected</span>
                    )}
                    <div className="flex items-center gap-2">
                      <Switch
                        aria-label={`Authorize ${member.email}`}
                        checked={member.is_authorized}
                        disabled={
                          member.email === PROTECTED_DEVELOPER_EMAIL || setAuthorization.isPending
                        }
                        onCheckedChange={(checked) =>
                          setAuthorization.mutate({ userId: member.id, authorized: checked })
                        }
                      />
                      <span className="text-xs text-muted-foreground">Access</span>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {!canManageAccess ? (
        <p className="text-sm text-muted-foreground">
          Only Admins and Developers can change access or roles.
        </p>
      ) : null}

      <Button variant="outline" onClick={() => void query.refetch()}>
        Refresh presence
      </Button>
    </div>
  );
}
