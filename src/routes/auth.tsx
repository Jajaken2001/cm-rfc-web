import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";

import { GoogleSignInButton } from "@/components/portal/GoogleSignInButton";
import { useSession } from "@/hooks/useMe";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Request & Feedback Portal" },
      {
        name: "description",
        content: "Sign in with your authorized Google account to access the employee portal.",
      },
      { property: "og:title", content: "Sign in — Request & Feedback Portal" },
      {
        property: "og:description",
        content: "Google sign-in for authorized employees of the Request & Feedback Portal.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="panel w-full max-w-sm p-8 text-center">
        <span className="mx-auto flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShieldCheck className="size-6" />
        </span>
        <h1 className="mt-5 text-xl">Sign in to the portal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Google sign-in is the only way in. Only accounts authorized by an administrator can
          continue past this step.
        </p>
        <GoogleSignInButton className="mt-6 w-full" />
        <div className="mt-6 flex justify-center gap-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Back home
          </Link>
          <Link to="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
