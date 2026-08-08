import { Loader2, Inbox, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-14 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-14 text-center">
      <Inbox className="size-6 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function ErrorState({
  message = "Something went wrong. Please try again.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 py-12 text-center">
      <AlertTriangle className="size-6 text-destructive" />
      <p className="mt-3 text-sm font-medium text-destructive">{message}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-3 rounded-md border border-input bg-background px-3 py-1.5 text-sm transition-colors hover:bg-secondary"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/40",
  approved: "bg-success/15 text-success border-success/40",
  declined: "bg-destructive/10 text-destructive border-destructive/30",
  new: "bg-info/15 text-info border-info/40",
  acknowledged: "bg-success/15 text-success border-success/40",
  draft: "bg-muted text-muted-foreground border-border",
  scheduled: "bg-info/15 text-info border-info/40",
  published: "bg-success/15 text-success border-success/40",
  expired: "bg-muted text-muted-foreground border-border",
  archived: "bg-muted text-muted-foreground border-border",
  online: "bg-success/15 text-success border-success/40",
  offline: "bg-muted text-muted-foreground border-border",
  developer: "bg-primary/10 text-primary border-primary/30",
  admin: "bg-info/15 text-info border-info/40",
  moderator: "bg-accent/15 text-accent border-accent/40",
  user: "bg-muted text-muted-foreground border-border",
  unauthorized: "bg-destructive/10 text-destructive border-destructive/30",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const key = status.toLowerCase();
  return (
    <Badge
      variant="outline"
      className={cn("capitalize font-medium", STATUS_STYLES[key] ?? STATUS_STYLES["draft"])}
    >
      {label ?? status}
    </Badge>
  );
}
