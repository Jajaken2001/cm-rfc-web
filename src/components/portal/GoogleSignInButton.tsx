import { useState } from "react";
import { toast } from "sonner";

import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton({
  label = "Continue with Google",
  className,
  size = "lg",
}: {
  label?: string;
  className?: string;
  size?: "default" | "sm" | "lg";
}) {
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setBusy(true);
    try {
      const here = `${window.location.pathname}${window.location.search}`;
      if (here.startsWith("/") && !here.startsWith("//") && here !== "/") {
        window.sessionStorage.setItem("portal-post-login-path", here);
      }
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Sign-in failed", { description: "Please try again." });
        setBusy(false);
        return;
      }
      if (result.redirected) return;
      window.location.assign("/dashboard");
    } catch {
      toast.error("Sign-in failed", { description: "Please try again." });
      setBusy(false);
    }
  }

  return (
    <Button onClick={handleSignIn} disabled={busy} size={size} className={className}>
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
        <path
          fill="currentColor"
          d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.63 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.94S8.78 6.3 12 6.3c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.72 14.53 2.8 12 2.8 6.98 2.8 2.9 6.88 2.9 11.9S6.98 21 12 21c5.78 0 9.6-4.06 9.6-9.78 0-.66-.08-1.16-.25-1.62z"
        />
      </svg>
      {busy ? "Opening Google…" : label}
    </Button>
  );
}
