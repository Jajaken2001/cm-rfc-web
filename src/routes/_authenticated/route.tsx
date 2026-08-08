import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

import { PortalLayout } from "@/components/portal/PortalLayout";
import { LoadingState } from "@/components/portal/Primitives";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/useMe";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { profile, role, isLoading, isError } = useMe();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <LoadingState label="Preparing your workspace…" />
      </div>
    );
  }

  if (isError || !profile) {
    return <AccessNotice title="We couldn't load your account" body="Please refresh the page. If this keeps happening, contact your administrator." />;
  }

  if (!profile.is_authorized || !role) {
    return (
      <AccessNotice
        title="Your account isn't authorized yet"
        body="You signed in successfully, but an administrator has not granted you access to this portal. Please contact your administrator to be authorized."
      />
    );
  }

  return (
    <PortalLayout>
      <Outlet />
    </PortalLayout>
  );
}

function AccessNotice({ title, body }: { title: string; body: string }) {
  async function signOut() {
    await supabase.auth.signOut();
    window.location.assign("/");
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="panel w-full max-w-md p-8 text-center">
        <span className="mx-auto flex size-11 items-center justify-center rounded-md bg-destructive/10 text-destructive">
          <ShieldAlert className="size-6" />
        </span>
        <h1 className="mt-5 text-xl">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
        <Button variant="outline" className="mt-6 w-full" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
