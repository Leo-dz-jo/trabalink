import { motion, useScroll, useSpring } from "framer-motion";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronDown,
  Compass,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Plus,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { BrandLockup } from "@/components/brand/brand";
import { Copilot } from "@/components/assistant/copilot";
import { ChangePasswordDialog } from "@/components/auth/change-password-dialog";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useViewer } from "@/hooks/use-viewer";
import { isDemoEmail } from "@/lib/demo";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: number;
}

const applicantNav: NavItem[] = [
  { to: "/app", label: "Feed", icon: LayoutDashboard, end: true },
  { to: "/app/jobs", label: "Roles", icon: Compass },
  { to: "/app/interviews", label: "Interviews", icon: CalendarDays },
  { to: "/app/applications", label: "Applications", icon: FileText },
  { to: "/app/messages", label: "Messages", icon: MessageSquare },
  { to: "/app/resume", label: "Resume AI", icon: Sparkles },
];

const employerNav: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/employer/jobs", label: "Job posts", icon: BriefcaseBusiness },
  { to: "/app/employer/pipeline", label: "Pipeline", icon: Users },
  { to: "/app/interviews", label: "Interviews", icon: CalendarDays },
  { to: "/app/messages", label: "Messages", icon: MessageSquare },
  { to: "/app/profile", label: "Company", icon: Building2 },
];

const adminNav: NavItem[] = [
  { to: "/app/admin", label: "Overview", icon: ShieldCheck, end: true },
  { to: "/app/admin/users", label: "Accounts", icon: Users },
  { to: "/app/admin/jobs", label: "Job posts", icon: BriefcaseBusiness },
  { to: "/app/jobs", label: "Role catalog", icon: Compass },
];

function TopNavLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "group relative inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[12.5px] font-semibold tracking-tight transition-colors",
          isActive
            ? "text-primary-foreground"
            : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="app-nav-active"
              className="absolute inset-0 rounded-md bg-primary shadow-[0_6px_18px_-12px_rgba(11,34,57,0.7)]"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          <item.icon
            className={cn(
              "relative z-10 size-4",
              isActive ? "text-primary-foreground" : "text-muted-foreground",
            )}
          />
          <span className="relative z-10">{item.label}</span>
          {Boolean(item.badge) && (
            <span
              className={cn(
                "relative z-10 flex min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-4",
                isActive
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-gold text-gold-foreground",
              )}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function MobileTopNavLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "relative flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[11.5px] font-semibold transition-colors",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon
            className={cn(
              "size-3.5",
              isActive ? "text-primary-foreground" : "text-muted-foreground",
            )}
          />
          <span>{item.label}</span>
          {Boolean(item.badge) && (
            <span
              className={cn(
                "flex min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-4",
                isActive
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-gold text-gold-foreground",
              )}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export function AppShell() {
  const { viewer } = useViewer();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const unread = useQuery(api.conversations.unreadCount);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const scrollScale = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 28,
    restDelta: 0.001,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      if (event.altKey && event.key.toLowerCase() === "j") {
        event.preventDefault();
        setAssistantOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const isAdmin = viewer?.user.role === "admin";
  const isEmployer = viewer?.user.role === "employer";
  const roleLabel = isAdmin
    ? "Administrator"
    : isEmployer
      ? "Employer"
      : "Applicant";
  const nav = (
    isAdmin ? adminNav : isEmployer ? employerNav : applicantNav
  ).map((item) =>
    item.to === "/app/messages" ? { ...item, badge: unread ?? 0 } : item,
  );
  const name = isAdmin
    ? (viewer?.user.name ?? "Administrator")
    : isEmployer
      ? (viewer?.employer?.companyName ?? viewer?.user.name ?? "Company")
      : (viewer?.applicant?.fullName ?? viewer?.user.name ?? "Applicant");
  const photo = isAdmin
    ? viewer?.user.image
    : isEmployer
      ? viewer?.employer?.logoUrl
      : viewer?.applicant?.photoUrl;

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <div className="min-h-screen">
      <motion.div
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gold/80"
        style={{ scaleX: scrollScale }}
        aria-hidden="true"
      />
      <header className="sticky top-0 z-50 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pt-4">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[calc(100%+1.5rem)] bg-gradient-to-b from-background via-background/85 to-transparent"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-7xl rounded-[1rem] border border-border/80 bg-card/90 p-1.5 shadow-[0_1px_2px_rgba(11,34,57,0.05),0_18px_52px_-30px_rgba(11,34,57,0.5)] backdrop-blur-2xl">
          <span
            className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent"
            aria-hidden="true"
          />
          <div className="flex h-12 items-center gap-3 pl-1.5 pr-0.5">
            <BrandLockup to="/app" size="sm" animate />

            <nav
              aria-label="Primary"
              className="ml-2 hidden items-center gap-0.5 rounded-lg border border-border/50 bg-muted/60 p-1 lg:flex"
            >
              {nav.map((item) => (
                <TopNavLink key={item.to} item={item} />
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
              {isEmployer && (
                <>
                  <Button
                    className="mr-0.5 hidden h-9 rounded-full px-3.5 text-xs shadow-[0_8px_20px_-12px_rgba(21,58,91,0.8)] sm:inline-flex"
                    onClick={() => navigate("/app/employer/jobs/new")}
                  >
                    <Plus className="size-3.5" /> Post a job
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-full sm:hidden"
                    aria-label="Post a job"
                    onClick={() => navigate("/app/employer/jobs/new")}
                  >
                    <Plus className="size-[18px]" />
                  </Button>
                </>
              )}

              <NotificationsBell />

              <button
                type="button"
                className="relative flex size-10 items-center justify-center rounded-full border border-gold/40 bg-gold-soft text-gold transition-all hover:-translate-y-0.5 hover:border-gold hover:bg-gold hover:text-gold-foreground sm:size-9"
                aria-label="Open TRABALINK assistant"
                aria-keyshortcuts="Alt+J"
                title="Open copilot (Alt+J)"
                onClick={() => setAssistantOpen(true)}
              >
                <Sparkles className="size-4" />
                <span className="absolute -right-0.5 -top-0.5 size-2 animate-pulse rounded-full bg-gold ring-2 ring-background" />
              </button>

              <ThemeToggle className="size-10 border-border/70 bg-card/60 sm:size-9" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex min-h-10 items-center gap-1.5 rounded-full border border-border/70 bg-card/70 p-0.5 text-left transition-colors hover:border-gold/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-0"
                    aria-label="Account menu"
                  >
                    <UserAvatar name={name} src={photo} className="size-8" />
                    <ChevronDown className="mr-1 hidden size-3.5 text-muted-foreground xl:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="font-normal">
                    <p className="truncate text-sm font-semibold">{name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {roleLabel} · {viewer?.user.email ?? "Trabalink"}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isAdmin ? (
                    <DropdownMenuItem onClick={() => navigate("/app/admin")}>
                      <ShieldCheck className="mr-2 size-4" /> Moderation console
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => navigate("/app/profile")}>
                      <UserRound className="mr-2 size-4" />{" "}
                      {isEmployer ? "Company profile" : "My profile"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate("/app/jobs")}>
                    <Compass className="mr-2 size-4" /> Role catalog
                  </DropdownMenuItem>
                  {viewer?.user.email && !isDemoEmail(viewer.user.email) && (
                    <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
                      <KeyRound className="mr-2 size-4" /> Password & security
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 size-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mx-1 mt-1.5 rounded-lg border border-border/60 bg-muted/50 p-1 lg:hidden">
            <nav
              aria-label="Primary"
              className="no-scrollbar mx-auto flex max-w-7xl overflow-x-auto"
            >
              {nav.map((item) => (
                <MobileTopNavLink key={item.to} item={item} />
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-3 pt-4 pb-[calc(3rem+env(safe-area-inset-bottom))] sm:px-5 sm:pt-5 lg:px-6 lg:pt-6">
        {viewer?.user.suspendedAt && (
          <div className="mb-5 rounded-md border border-unqualified/25 bg-unqualified-soft px-4 py-3 text-xs leading-relaxed text-unqualified">
            <span className="font-bold">This account is suspended.</span> You
            can read your records, but applications, messaging, job posting, and
            profile edits are blocked. Contact the administrator to restore
            access.
          </div>
        )}
        <Outlet />
      </main>

      <Copilot
        key={`${viewer?.user.role ?? "guest"}-${name}`}
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
      />
      {viewer?.user.email && !isDemoEmail(viewer.user.email) && (
        <ChangePasswordDialog
          open={passwordOpen}
          onOpenChange={setPasswordOpen}
          email={viewer.user.email}
        />
      )}
    </div>
  );
}
