import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  CircleSlash,
  Lock,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  EmptyState,
  PageHeader,
  PageTransition,
  SectionCard,
  StatCard,
} from "@/components/shared/page";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useViewer } from "@/hooks/use-viewer";
import { isDemoEmail } from "@/lib/demo";
import { formatDate, pluralise, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type TabKey = "overview" | "users" | "jobs";

const ROLE_LABEL: Record<string, string> = {
  applicant: "Applicant",
  employer: "Employer",
  admin: "Administrator",
  unassigned: "Unassigned",
};

export default function AdminConsole() {
  const location = useLocation();
  const navigate = useNavigate();
  const { viewer } = useViewer();
  const { signOut } = useAuth();
  const status = useQuery(api.admin.status);
  const bootstrap = useMutation(api.admin.bootstrap);
  const setUserSuspended = useMutation(api.admin.setUserSuspended);
  const setJobStatus = useMutation(api.admin.setJobStatus);
  const removeJob = useMutation(api.admin.removeJob);

  const [userSearch, setUserSearch] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [bootstrapping, setBootstrapping] = useState(false);
  const [userToSuspend, setUserToSuspend] = useState<{
    id: Id<"users">;
    name: string;
  } | null>(null);
  const [jobToDelete, setJobToDelete] = useState<{
    id: Id<"jobs">;
    title: string;
    applications: number;
  } | null>(null);

  const isAdmin = status?.isAdmin === true;
  const tab: TabKey = location.pathname.endsWith("/users")
    ? "users"
    : location.pathname.endsWith("/jobs")
      ? "jobs"
      : "overview";

  const users = useQuery(
    api.admin.listUsers,
    isAdmin ? { search: userSearch.trim() || undefined } : "skip",
  );
  const jobs = useQuery(
    api.admin.listJobs,
    isAdmin ? { search: jobSearch.trim() || undefined } : "skip",
  );

  if (status === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-border/70 bg-card" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-2xl border border-border/70 bg-card" />
      </div>
    );
  }

  if (!isAdmin && isDemoEmail(viewer?.user.email)) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-xl py-6">
          <div className="rounded-lg border border-border/80 bg-card p-6 card-shadow-lg sm:p-8">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <Lock className="size-6" />
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Demo workspace
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-[-0.03em]">
              Moderation needs a real account.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The shared demo accounts can apply, hire, message, and manage their own
              content, but they cannot claim administrator access or suspend other
              accounts. Sign in with your own verified email to test the moderation
              console.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                className="h-11 rounded-xl"
                onClick={async () => {
                  await signOut();
                  navigate("/auth", { replace: true });
                }}
              >
                Use a real account
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-xl">
                <Link to="/app">Return to dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!isAdmin) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-xl py-6">
          <div className="rounded-lg border border-border/80 bg-card p-6 card-shadow-lg sm:p-8">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <ShieldCheck className="size-6" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-extrabold tracking-[-0.03em]">
              {status.adminExists ? "Administrator access required" : "Founding administrator setup"}
            </h1>
            {status.adminExists ? (
              <>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  This console moderates accounts and job posts across TRABALINK. Your
                  account does not have administrator rights. If you believe this is a
                  mistake, contact the existing administrator.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild className="h-11 rounded-xl">
                    <Link to="/app">Return to dashboard</Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 rounded-xl">
                    <Link to="/app/jobs">Browse role catalog</Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  TRABALINK does not ship with a default administrator. The first
                  verified account to claim this console becomes the founding
                  administrator. The option disappears permanently once that happens.
                </p>
                <div className="mt-4 space-y-2 rounded-xl border border-border/70 bg-muted/40 p-4 text-[11px] leading-relaxed text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    Only claim this if you own or operate this deployment.
                  </p>
                  <p className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    Administrators can suspend accounts and remove job posts, but cannot
                    read private messages or resume files.
                  </p>
                  <p className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    Signed in as {viewer?.user.email ?? "your verified account"}.
                  </p>
                </div>
                <Button
                  className="mt-5 h-11 w-full rounded-xl"
                  disabled={bootstrapping}
                  onClick={async () => {
                    setBootstrapping(true);
                    try {
                      await bootstrap();
                      toast.success("You are now the founding administrator.");
                      navigate("/app/admin", { replace: true });
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Could not claim administrator access.",
                      );
                    } finally {
                      setBootstrapping(false);
                    }
                  }}
                >
                  {bootstrapping ? "Claiming access…" : "Claim administrator access"}
                </Button>
              </>
            )}
          </div>
        </div>
      </PageTransition>
    );
  }

  const totalApplications = jobs?.reduce((sum, job) => sum + job.applicationCount, 0) ?? 0;
  const suspended = users?.filter((user) => user.suspendedAt).length ?? 0;
  const employers = users?.filter((user) => user.role === "employer").length ?? 0;
  const applicants = users?.filter((user) => user.role === "applicant").length ?? 0;

  async function toggleSuspension(userId: Id<"users">, suspendedNow: boolean) {
    try {
      await setUserSuspended({
        userId,
        suspended: suspendedNow,
        reason: suspendedNow ? "Administrative review" : undefined,
      });
      toast.success(suspendedNow ? "Account suspended." : "Account restored.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the account.");
    }
  }

  async function approveJobRemoval() {
    if (!jobToDelete) return;
    try {
      await removeJob({ jobId: jobToDelete.id });
      toast.success("Job post and its applications were removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove the job.");
    } finally {
      setJobToDelete(null);
    }
  }

  return (
    <PageTransition className="space-y-6">
      <PageHeader
        eyebrow="Platform administration"
        title="Moderate the marketplace with a light touch."
        description="Review accounts and job posts, suspend policy violations, and remove posts that should not be public. Actions take effect immediately and private messages stay private."
        actions={
          <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-primary/15 bg-accent px-3.5 text-xs font-semibold text-accent-foreground">
            <ShieldCheck className="size-4" /> Administrator
          </span>
        }
      />

      <Tabs
        value={tab}
        onValueChange={(value) =>
          navigate(value === "overview" ? "/app/admin" : `/app/admin/${value}`)
        }
      >
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-border/70 bg-card p-1 no-scrollbar">
          <TabsTrigger
            value="overview"
            className="h-9 shrink-0 rounded-lg px-3 text-xs font-semibold data-[state=active]:bg-accent data-[state=active]:text-primary"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="h-9 shrink-0 rounded-lg px-3 text-xs font-semibold data-[state=active]:bg-accent data-[state=active]:text-primary"
          >
            Accounts
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {users?.length ?? 0}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="jobs"
            className="h-9 shrink-0 rounded-lg px-3 text-xs font-semibold data-[state=active]:bg-accent data-[state=active]:text-primary"
          >
            Job posts
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {jobs?.length ?? 0}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Accounts"
              value={users?.length ?? 0}
              icon={Users}
              hint={`${applicants} applicants · ${employers} employers`}
            />
            <StatCard
              label="Suspended"
              value={suspended}
              icon={CircleSlash}
              hint="Read-only until restored"
              delay={0.05}
            />
            <StatCard
              label="Job posts"
              value={jobs?.length ?? 0}
              icon={BriefcaseBusiness}
              hint={`${jobs?.filter((job) => job.status === "open").length ?? 0} open`}
              delay={0.1}
            />
            <StatCard
              label="Applications"
              value={totalApplications}
              icon={UserCog}
              hint="Across every job post"
              delay={0.15}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Newest accounts"
              description="Recent sign-ups across both roles."
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg text-xs"
                  onClick={() => navigate("/app/admin/users")}
                >
                  Manage all
                </Button>
              }
            >
              {users === undefined ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="h-14 animate-pulse rounded-xl bg-muted" />
                  ))}
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {users.slice(0, 5).map((user) => (
                    <li key={user._id} className="flex items-center gap-2.5">
                      <UserAvatar name={user.name} src={user.photoUrl} className="size-8" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{user.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {ROLE_LABEL[user.role] ?? user.role} · joined {formatDate(user.createdAt)}
                        </p>
                      </div>
                      {user.suspendedAt ? (
                        <span className="rounded-full bg-unqualified-soft px-2 py-0.5 text-[9px] font-bold uppercase text-unqualified">
                          Suspended
                        </span>
                      ) : (
                        <span className="rounded-full bg-qualified-soft px-2 py-0.5 text-[9px] font-bold uppercase text-qualified">
                          Active
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard
              title="Newest job posts"
              description="Open and closed roles across the marketplace."
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg text-xs"
                  onClick={() => navigate("/app/admin/jobs")}
                >
                  Manage all
                </Button>
              }
            >
              {jobs === undefined ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="h-14 animate-pulse rounded-xl bg-muted" />
                  ))}
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {jobs.slice(0, 5).map((job) => (
                    <li key={job._id} className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-[10px] font-bold text-accent-foreground">
                        {job.companyName.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{job.title}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {job.companyName} · {pluralise(job.applicationCount, "applicant")}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                          job.status === "open"
                            ? "bg-qualified-soft text-qualified"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {job.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          <div className="rounded-2xl border border-conditional/25 bg-conditional-soft p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-conditional" />
              <div>
                <p className="text-sm font-bold">Moderation principles</p>
                <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-muted-foreground">
                  Suspend only for clear policy violations: fraudulent company identities,
                  discriminatory posts, or misuse of applicant data. Suspension blocks
                  applications, job posting, messaging, and profile edits while preserving
                  records for review. Removing a job post also removes its applications and
                  conversations, so prefer closing a post when the role has history worth
                  keeping.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-card p-4 card-shadow">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search by name, email, or role"
                aria-label="Search accounts"
                className="h-10 rounded-xl pl-8"
              />
            </div>
          </div>

          {users === undefined ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl border border-border/70 bg-card" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No accounts match that search"
              description="Try a different name, email, or role."
            >
              <Button variant="outline" className="h-10 rounded-xl" onClick={() => setUserSearch("")}>
                Clear search
              </Button>
            </EmptyState>
          ) : (
            <div className="space-y-2">
              {users.map((user, index) => (
                <motion.div
                  key={user._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.2) }}
                  className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 card-shadow sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <UserAvatar name={user.name} src={user.photoUrl} className="size-10" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold">{user.name}</p>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                          {ROLE_LABEL[user.role] ?? user.role}
                        </span>
                        {user.suspendedAt && (
                          <span className="rounded-full bg-unqualified-soft px-2 py-0.5 text-[9px] font-bold uppercase text-unqualified">
                            Suspended
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {user.email ?? "No email on record"} · joined {formatDate(user.createdAt)}
                      </p>
                      {user.suspendedAt && (
                        <p className="mt-0.5 text-[10px] text-unqualified">
                          {user.suspendedReason ?? "Policy review"} ·{" "}
                          {timeAgo(user.suspendedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                  {user.role !== "admin" && (
                    <Button
                      size="sm"
                      variant={user.suspendedAt ? "outline" : "ghost"}
                      className="h-9 w-fit rounded-lg"
                      onClick={() =>
                        user.suspendedAt
                          ? void toggleSuspension(user._id, false)
                          : setUserToSuspend({ id: user._id, name: user.name })
                      }
                    >
                      {user.suspendedAt ? (
                        <>
                          <RotateCcw className="size-3.5" /> Restore access
                        </>
                      ) : (
                        <>
                          <Lock className="size-3.5" /> Suspend
                        </>
                      )}
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "jobs" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-card p-4 card-shadow">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={jobSearch}
                onChange={(event) => setJobSearch(event.target.value)}
                placeholder="Search by role, company, or location"
                aria-label="Search job posts"
                className="h-10 rounded-xl pl-8"
              />
            </div>
          </div>

          {jobs === undefined ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl border border-border/70 bg-card" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <EmptyState
              icon={BriefcaseBusiness}
              title="No job posts match that search"
              description="Try a different role title, company, or location."
            >
              <Button variant="outline" className="h-10 rounded-xl" onClick={() => setJobSearch("")}>
                Clear search
              </Button>
            </EmptyState>
          ) : (
            <div className="space-y-2">
              {jobs.map((job, index) => (
                <motion.div
                  key={job._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.2) }}
                  className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 card-shadow sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold">{job.title}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                          job.status === "open"
                            ? "bg-qualified-soft text-qualified"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {job.status}
                      </span>
                      {job.isEntryLevel && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase text-accent-foreground">
                          Entry level
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {job.companyName} · {job.location} · {job.employmentType} ·{" "}
                      {pluralise(job.applicationCount, "applicant")} ·{" "}
                      {pluralise(job.requirementCount, "requirement")}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Posted {formatDate(job.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-lg"
                      onClick={async () => {
                        try {
                          await setJobStatus({
                            jobId: job._id,
                            status: job.status === "open" ? "closed" : "open",
                          });
                          toast.success(
                            job.status === "open" ? "Job post closed." : "Job post reopened.",
                          );
                        } catch (error) {
                          toast.error(
                            error instanceof Error ? error.message : "Could not update the job.",
                          );
                        }
                      }}
                    >
                      {job.status === "open" ? "Close post" : "Reopen post"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 rounded-lg text-destructive hover:bg-unqualified-soft hover:text-destructive"
                      onClick={() =>
                        setJobToDelete({
                          id: job._id,
                          title: job.title,
                          applications: job.applicationCount,
                        })
                      }
                    >
                      <Trash2 className="size-3.5" /> Remove
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      <AlertDialog
        open={Boolean(userToSuspend)}
        onOpenChange={(open) => !open && setUserToSuspend(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend {userToSuspend?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This account will no longer be able to apply, post jobs, edit profiles, or
              send messages. Existing records stay intact and access can be restored at
              any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (userToSuspend) void toggleSuspension(userToSuspend.id, true);
                setUserToSuspend(null);
              }}
            >
              Suspend account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(jobToDelete)}
        onOpenChange={(open) => !open && setJobToDelete(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove “{jobToDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the job post, its{" "}
              {jobToDelete?.applications ?? 0} application
              {jobToDelete?.applications === 1 ? "" : "s"}, and any related conversations.
              Consider closing the post instead if you need to keep the history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Keep post</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void approveJobRemoval()}
            >
              Remove permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
}
