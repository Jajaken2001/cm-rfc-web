import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { GoogleSignInButton } from "@/components/portal/GoogleSignInButton";
import { PublicShell } from "@/components/portal/PublicShell";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useMe";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/join/$code")({
  head: () => ({
    meta: [
      { title: "Join the Portal — Request & Feedback Portal" },
      { name: "description", content: "Redeem your access link to join the employee portal with a User account." },
      { property: "og:title", content: "Join the Portal — Request & Feedback Portal" },
      { property: "og:description", content: "Redeem your access link to join the employee portal with a User account." },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { code } = useParams({ from: "/join/$code" });
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const redeem = useMutation({
    mutationFn: async () => {
      const { data, error: rpcError } = await supabase.rpc("redeem_invite_link", { _code: code });
      if (rpcError) throw rpcError;
      return data as string;
    },
    onSuccess: () => {
      setDone(true);
      setTimeout(() => void navigate({ to: "/dashboard", replace: true }), 1200);
    },
    onError: (e) => setError(e instanceof Error ? e.message : "This access link could not be used."),
  });

  const redeemMutate = redeem.mutate;
  useEffect(() => {
    if (!loading && session && !done && !error && !redeem.isPending) {
      redeemMutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session]);

  return (
    <PublicShell>
      <section className="mx-auto flex max-w-xl flex-col items-center px-5 py-20 text-center">
        <ShieldCheck className="size-10 text-accent" />
        <h1 className="mt-5 text-3xl">You have been invited</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This access link authorizes your account with the standard <strong>User</strong> role. Sign
          in with your Google account to finish joining the portal.
        </p>

        <div className="mt-8 w-full">
          {loading ? (
            <p className="text-sm text-muted-foreground">Checking your session…</p>
          ) : !session ? (
            <GoogleSignInButton className="w-full sm:w-auto" />
          ) : done ? (
            <p className="inline-flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="size-4" /> Access granted — taking you to your dashboard…
            </p>
          ) : error ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={() => void navigate({ to: "/" })}>
                Back to home
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Redeeming your access link…</p>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
