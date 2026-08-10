import { Link, useRouterState } from "@tanstack/react-router";
import {
  BellRing,
  ClipboardList,
  FileSpreadsheet,
  Flag,
  LayoutDashboard,
  Link2,
  Menu,
  MessageSquareQuote,
  MessagesSquare,
  Megaphone,
  PanelsTopLeft,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMe } from "@/hooks/useMe";
import {
  ROLE_LABEL,
  initialsOf,
  isAdminRole,
  isDeveloperRole,
  isStaff,
  type AppRole,
} from "@/lib/portal";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/portal/Primitives";
import { AnnouncementModal } from "@/components/portal/AnnouncementModal";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Wallet;
}

function navForRole(role: AppRole | null): NavItem[] {
  if (isStaff(role)) {
    const items: NavItem[] = [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/manage/requests", label: "Requests", icon: ClipboardList },
      { to: "/manage/forms", label: "Forms", icon: FileSpreadsheet },
      { to: "/manage/users", label: "Users", icon: Users },
      { to: "/manage/feedback", label: "Feedback", icon: MessageSquareQuote },
      { to: "/chat", label: "Chat Rooms", icon: MessagesSquare },
    ];
    if (isAdminRole(role)) {
      items.push({ to: "/manage/moderation", label: "Moderation", icon: ShieldCheck });
      items.push({ to: "/manage/invites", label: "Access Links", icon: Link2 });
      items.push({ to: "/manage/deductions", label: "Deductions", icon: Wallet });
    }
    items.push({ to: "/manage/updates", label: "Updates", icon: Megaphone });
    if (isDeveloperRole(role)) {
      items.push({ to: "/manage/banners", label: "Banners", icon: Flag });
      items.push({ to: "/manage/cms", label: "Landing Page", icon: PanelsTopLeft });
      items.push({ to: "/manage/audit", label: "Audit Logs", icon: ScrollText });
    }
    items.push({ to: "/settings", label: "Settings", icon: Settings });
    return items;
  }
  return [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/notifications", label: "Notifications", icon: BellRing },
    { to: "/my-requests", label: "My Requests", icon: ClipboardList },
    { to: "/request-forms", label: "Request Forms", icon: FileSpreadsheet },
    { to: "/feedback-forms", label: "Feedback Forms", icon: MessageSquareQuote },
    { to: "/deductions", label: "Deductions", icon: Wallet },
    { to: "/chat", label: "Chat Rooms", icon: MessagesSquare },
    { to: "/settings", label: "Settings", icon: Settings },
  ];
}

function NavList({ role, onNavigate }: { role: AppRole | null; onNavigate?: (() => void) | undefined }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {navForRole(role).map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const { profile, role } = useMe();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-4">
        <span className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <ShieldCheck className="size-4" />
        </span>
        <span className="font-display text-sm leading-tight">Request &amp; Feedback Portal</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavList role={role} onNavigate={onNavigate} />
      </div>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar className="size-9">
            {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
            <AvatarFallback className="bg-sidebar-accent text-xs uppercase text-sidebar-accent-foreground">
              {profile ? initialsOf(profile.full_name, profile.email) : "…"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
              {profile?.full_name ?? profile?.email ?? "—"}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/70">{profile?.email}</p>
          </div>
        </div>
        <div className="px-2 pb-2">
          {role ? <StatusBadge status={role} label={ROLE_LABEL[role]} /> : null}
        </div>
        <Link
          to="/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <Settings className="size-4" /> Settings
        </Link>
      </div>
    </div>
  );
}

export function PortalLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 w-64">
          <SidebarBody />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-0 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarBody onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="font-display text-sm">Request &amp; Feedback Portal</span>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
      <AnnouncementModal />
    </div>
  );
}
