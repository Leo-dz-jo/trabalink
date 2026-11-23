import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Plus,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { Link } from "react-router";
import { BucketBadge, ScoreRing, StatusBadge } from "@/components/shared/badges";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { EmptyState, StatCard } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useViewer } from "@/hooks/use-viewer";
import { formatDate, pluralise, timeAgo } from "@/lib/format";
import { employerCompleteness } from "@/lib/profile";

export function EmployerDashboard() {
  const { viewer, employer } = useViewer();
  const stats = useQuery(api.applications.stats);
  const jobs = useQuery(api.jobs.listMine);
  const completeness = employerCompleteness(employer);
  const company = employer?.companyName ?? viewer?.user.name ?? "your team";

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Employer dashboard
          </p>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">
            {stats && stats.newApplicants > 0
              ? `${stats.newApplicants} new applicant${stats.newApplicants === 1 ? "" : "s"} waiting.`
              : `Ready when you are, ${company}.`}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Ranked, explainable applicants — with the exact requirements each person meets.
            You make every decision.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-10 rounded-xl">
            <Link to="/app/employer/pipeline">
              <Users className="size-4" /> Pipeline
            </Link>
          </Button>
          <Button asChild className="h-10 rounded-xl px-4">
            <Link to="/app/employer/jobs/new">
              <Plus className="size-4" /> Post a job
            </Link>
          </Button>
        </div>
      </header>

      {!employer && (
        <div className="rounded-2xl border border-conditional/25 bg-conditional-soft p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card text-conditional">
                <BriefcaseBusiness className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold">Add your company profile first</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Applicants need to know who they are talking to, and job posts require
                  a company record.
                </p>
              </div>
            </div>
            <Button asChild className="h-10 shrink-0 rounded-xl">
              <Link to="/app/profile?onboarding=1">Set up company</Link>
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Open jobs"
          value={stats?.openJobs ?? 0}
          icon={BriefcaseBusiness}
          hint={`${stats?.totalJobs ?? 0} posted in total`}
        />
        <StatCard
          label="New applicants"
          value={stats?.newApplicants ?? 0}
          icon={UserPlus}
          hint={`${stats?.totalApplicants ?? 0} in your pipeline`}
          delay={0.05}
        />
        <StatCard
          label="Qualified"
          value={stats?.qualified ?? 0}
          icon={CheckCircle2}
          hint="Every mandatory requirement met"
          delay={0.1}
        />
        <StatCard
          label="Conditional"
          value={stats?.conditional ?? 0}
          icon={Clock3}
          hint="Waiting on a credential or exam"
          delay={0.15}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Review queue</h2>
              <p className="text-xs text-muted-foreground">
                Newest applications first. Scores refresh when a profile changes.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-9 rounded-lg">
              <Link to="/app/employer/pipeline">
                Open pipeline <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          {stats === undefined ? (
            <div className="space-y-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-24 animate-pulse rounded-lg border border-border bg-card" />
              ))}
            </div>
          ) : stats.recent.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No applicants yet"
              description="Once someone applies, their score and requirement breakdown land here for human review."
            >
              <Button asChild variant="outline" className="h-10 rounded-xl">
                <Link to="/app/employer/jobs">View your job posts</Link>
              </Button>
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {stats.recent.map((row, index) => (
                <motion.div
                  key={row.applicationId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    to={`/app/employer/applications/${row.applicationId}`}
                    className="group flex items-center gap-3.5 border border-border bg-card p-4 transition-colors hover:border-primary/40"
                  >
                    <ScoreRing score={row.score} bucket={row.bucket} size={52} showMax={false} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold">{row.applicantName}</p>
                        <StatusBadge status={row.status} />
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {row.jobTitle} · {timeAgo(row.createdAt)}
                      </p>
                      <div className="mt-1.5">
                        <BucketBadge bucket={row.bucket} compact />
                      </div>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          <div className="border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border p-5">
              <div>
                <h2 className="font-display text-base font-bold">Your job posts</h2>
                <p className="text-xs text-muted-foreground">
                  {pluralise(jobs?.length ?? 0, "role")} · manage status and requirements
                </p>
              </div>
              <Button asChild size="sm" className="h-9 rounded-lg">
                <Link to="/app/employer/jobs/new">
                  <Plus className="size-3.5" /> New
                </Link>
              </Button>
            </div>
            {jobs === undefined ? (
              <div className="space-y-2 p-5 pt-0">
                {[0, 1].map((index) => (
                  <div key={index} className="h-16 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-5 pt-0">
                <div className="rounded-md border border-dashed border-border px-4 py-8 text-center">
                  <BriefcaseBusiness className="mx-auto size-5 text-muted-foreground" />
                  <p className="mt-2 text-sm font-semibold">No job posts yet</p>
                  <p className="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-muted-foreground">
                    Start with one role. Weighted requirements let Trabalink rank every
                    applicant with a defensible reason.
                  </p>
                  <Button asChild size="sm" className="mt-3 h-9 rounded-lg">
                    <Link to="/app/employer/jobs/new">Post your first job</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {jobs.map((job) => (
                  <li key={job._id} className="flex items-center gap-3 px-5 py-3.5">
                    <span
                      className={`size-2 shrink-0 rounded-full ${
                        job.status === "open" ? "bg-qualified" : "bg-muted-foreground/40"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{job.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {job.location} · {job.employmentType} ·{" "}
                        {pluralise(job.applicationCount, "applicant")}
                        {job.newCount > 0 ? ` (${job.newCount} new)` : ""}
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="h-8 shrink-0 rounded-lg text-xs">
                      <Link to={`/app/employer/jobs/${job._id}/applicants`}>Review</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold">Company profile</h2>
              <span className="text-lg font-semibold text-primary">
                <AnimatedNumber value={completeness.percent} />%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${completeness.percent}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            {completeness.suggestions.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {completeness.suggestions.slice(0, 3).map((suggestion) => (
                  <li key={suggestion} className="flex items-start gap-2 text-[11px]">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-conditional" />
                    <span className="text-muted-foreground">{suggestion}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Everything essential is filled in. Applicants see a complete company
                profile on every post.
              </p>
            )}
            <Button asChild variant="outline" size="sm" className="mt-3 h-9 w-full rounded-lg">
              <Link to="/app/profile">Edit company</Link>
            </Button>
          </div>

          <div className="border border-conditional/30 bg-conditional-soft p-5">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-4 text-conditional" />
              <h2 className="font-display text-sm font-bold">Conditions to watch</h2>
            </div>
            {stats === undefined ? (
              <p className="mt-2 text-[11px] text-muted-foreground">Loading…</p>
            ) : stats.pendingConditions.length === 0 ? (
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                No outstanding licenses or exams. Conditional applications will appear
                here with their deadlines.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {stats.pendingConditions.slice(0, 4).map((condition, index) => (
                  <li key={`${condition.applicationId}-${index}`} className="text-[11px] leading-relaxed">
                    <Link
                      to={`/app/employer/applications/${condition.applicationId}`}
                      className="inline-flex min-h-8 items-center font-semibold underline-offset-2 hover:underline"
                    >
                      {condition.applicantName}
                    </Link>
                    <p className="text-muted-foreground">
                      {condition.label} · {condition.jobTitle}
                    </p>
                    {condition.deadline && (
                      <p className="font-medium text-conditional">
                        Due {formatDate(condition.deadline)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border border-primary/20 bg-accent/60 p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <h2 className="font-display text-sm font-bold">Human-in-the-loop</h2>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Trabalink never rejects an applicant. You shortlist, reject, or hire — and
              you can always override a bucket with a note.
            </p>
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-accent-foreground">
              <Sparkles className="size-3" /> Scores are recommendations
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
