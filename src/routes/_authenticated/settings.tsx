import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader, StatusBadge } from "@/components/portal/Primitives";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMe } from "@/hooks/useMe";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, initialsOf } from "@/lib/portal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Request & Feedback Portal" },
      { name: "description", content: "Update your display name, choose a theme and sign out of the portal." },
      { property: "og:title", content: "Settings — Request & Feedback Portal" },
      { property: "og:description", content: "Update your display name, choose a theme and sign out of the portal." },
    ],
  }),
  component: SettingsPage,
});

const THEMES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function SettingsPage() {
  const { profile, role } = useMe();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");

  useEffect(() => {
    if (profile) setName(profile.full_name ?? "");
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("missing profile");
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Your name cannot be empty");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: trimmed })
        .eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Name updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save your name"),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/", replace: true });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your profile, appearance and session." />

      <section className="panel space-y-5 p-5">
        <div className="flex items-center gap-4">
          <Avatar className="size-12">
            {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
            <AvatarFallback className="text-sm uppercase">
              {profile ? initialsOf(profile.full_name, profile.email) : "…"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{profile?.email ?? "—"}</p>
            <div className="mt-1">
              {role ? <StatusBadge status={role} label={ROLE_LABEL[role]} /> : null}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="settings-name">Display name</Label>
          <Input
            id="settings-name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder="How your name appears in the portal"
          />
          <p className="text-xs text-muted-foreground">
            Your email address and role are managed by your administrators and cannot be changed here.
          </p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save name"}
        </Button>
      </section>

      <section className="panel space-y-4 p-5">
        <div>
          <h2 className="text-lg">Theme</h2>
          <p className="text-sm text-muted-foreground">
            Choose how the portal looks on this device.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              aria-pressed={theme === t.value}
              className={cn(
                "flex items-center gap-3 rounded-md border px-4 py-3 text-sm transition-colors",
                theme === t.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border hover:bg-secondary",
              )}
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel space-y-4 p-5">
        <div>
          <h2 className="text-lg">Session</h2>
          <p className="text-sm text-muted-foreground">
            Sign out of the portal on this device.
          </p>
        </div>
        <Button variant="outline" onClick={signOut} className="gap-2">
          <LogOut className="size-4" /> Logout
        </Button>
      </section>
    </div>
  );
}
