import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  GraduationCap,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ApplyDialog } from "@/components/jobs/apply-dialog";
import { StartConversationDialog } from "@/components/messaging/start-conversation-dialog";
import {
  Chip,
  RequirementStatusIcon,
  ScoreRing,
  StatusBadge,
} from "@/components/shared/badges";
import { EmptyState, PageTransition } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useViewer } from "@/hooks/use-viewer";
import { formatDate, formatSalary, pluralise } from "@/lib/format";
import {
  BUCKET_LABELS,
  scoreApplication,
  type QualificationResult,
  type ScoringRequirement,
} from "@/lib/scoring";
import { REQUIREMENT_TYPE_LABEL, CATEGORY_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const { applicant, viewer } = useViewer();
  const navigate = useNavigate();
  const [applyOpen, setApplyOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  // Captured once per mount so rendering never reads the clock directly.
  const [now] = useState(() => Date.now());

  const job = useQuery(
    api.jobs.get,
    jobId ? { jobId: jobId as Id<"jobs"> } : "skip",
  );

  const match = useMemo<QualificationResult | undefined>(() => {
    if (!job || !applicant) return undefined;
    return scoreApplication({
      job: { title: job.title, isEntryLevel: job.isEntryLevel },
      requirements: job.requirements as ScoringRequirement[],
      applicant: {
        skills: applicant.skills,
        education: applicant.education,
        experience: applicant.experience,
        certifications: applicant.certifications,
        isFreshGrad: applicant.isFreshGrad,
      },
    });
  }, [job, applicant]);

  if (!jobId) {
    return (
      <EmptyState icon={BriefcaseBusiness} title="Role not found" description="This job link looks incomplete.">
        <Button asChild variant="outline" className="h-10 rounded-xl">
          <Link to="/app/jobs">Back to jobs</Link>
        </Button>
      </EmptyState>
    );
  }

  if (job === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-56 animate-pulse rounded-2xl border border-border/70 bg-card" />
        <div className="h-72 animate-pulse rounded-2xl border border-border/70 bg-card" />
      </div>
    );
  }

  if (job === null) {
    return (
      <EmptyState
        icon={BriefcaseBusiness}
        title="This role is no longer available"
        description="It may have been removed by the employer. Browse other open roles instead."
      >
        <Button asChild className="h-10 rounded-xl">
          <Link to="/app/jobs">Browse jobs</Link>
        </Button>
      </EmptyState>
    );
  }

  const breakdownById = new Map(
    [...(match?.matched ?? []), ...(match?.partial ?? []), ...(match?.missing ?? [])].map(
      (row) => [row.requirementId, row],
    ),
  );
  const isClosed = job.status !== "open" || Boolean(job.deadline && job.deadline < now);
  const canApply = viewer?.user.role === "applicant" && Boolean(applicant) && !job.hasApplied && !isClosed;
  const knockoutCount = job.requirements.filter((requirement) => requirement.knockoutQuestion).length;
  const currentStatus = job.applicationStatus;

  return (
    <PageTransition className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-9 rounded-lg text-muted-foreground">
        <Link to="/app/jobs">
          <ArrowLeft className="size-4" /> Role catalog
        </Link>
      </Button>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card card-shadow">
        <div className="flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            {job.company.logoUrl ? (
              <img
                src={job.company.logoUrl}
                alt={`${job.company.name} logo`}
                className="size-14 shrink-0 rounded-2xl border border-border object-cover"
              />
            ) : (
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent font-display text-lg font-extrabold text-accent-foreground">
                {job.company.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {job.company.name}
                </p>
                {job.isEntryLevel && (
                  <Chip tone="accent">
                    <GraduationCap className="size-3" /> Entry level
                  </Chip>
                )}
                {isClosed && <Chip tone="warm">Closed</Chip>}
              </div>
              <h1 className="mt-1.5 font-display text-2xl font-extrabold leading-tight tracking-[-0.03em] sm:text-3xl">
                {job.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {job.isRemote ? "Remote (Philippines)" : job.location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BriefcaseBusiness className="size-3.5" /> {job.employmentType}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Banknote className="size-3.5" />
                  {formatSalary(job.salaryMin, job.salaryMax)}
                </span>
                {job.deadline && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="size-3.5" /> Apply by {formatDate(job.deadline)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            {job.isOwner ? (
              <>
                <div className="rounded-xl border border-primary/15 bg-accent px-3.5 py-2.5 text-[11px] text-accent-foreground">
                  You posted this role.
                </div>
                <Button
                  className="h-11 rounded-xl"
                  onClick={() => navigate(`/app/employer/jobs/${job._id}/applicants`)}
                >
                  <Users className="size-4" /> Review applicants
                </Button>
              </>
            ) : viewer?.user.role === "admin" ? (
              <Button asChild variant="outline" className="h-11 rounded-xl">
                <Link to="/app/admin">Administrator view</Link>
              </Button>
            ) : viewer?.user.role === "employer" ? (
              <Button asChild variant="outline" className="h-11 rounded-xl">
                <Link to="/app/employer/jobs">Employer view · your job posts</Link>
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  className="h-12 rounded-xl px-6"
                  disabled={!canApply}
                  onClick={() => setApplyOpen(true)}
                >
                  {job.hasApplied
                    ? "Application sent"
                    : isClosed
                      ? "Applications closed"
                      : !applicant
                        ? "Complete your profile to apply"
                        : "Apply to this role"}
                </Button>
                {job.hasApplied && currentStatus && (
                  <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                    Status <StatusBadge status={currentStatus} />
                  </div>
                )}
                {applicant && (
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl"
                    onClick={() => setMessageOpen(true)}
                  >
                    <MessageSquare className="size-4" /> Message hiring team
                  </Button>
                )}
                {!applicant && (
                  <Button asChild variant="outline" size="sm" className="h-9 rounded-lg">
                    <Link to="/app/profile">Complete profile</Link>
                  </Button>
                )}
                {knockoutCount > 0 && !job.hasApplied && (
                  <p className="text-center text-[10px] text-muted-foreground">
                    {pluralise(knockoutCount, "screening question")} included
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/60 bg-muted/30 px-5 py-3 text-[11px] text-muted-foreground sm:px-7">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-primary" /> Human review — no auto-rejections
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-primary" /> Score is a recommendation only
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" /> Match updates with your profile
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-border/70 bg-card p-5 card-shadow sm:p-6">
            <h2 className="font-display text-base font-bold">About the role</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {job.description}
            </p>

            {job.company.description && (
              <div className="mt-6 border-t border-border/60 pt-4">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-primary" />
                  <h3 className="text-sm font-bold">About {job.company.name}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {job.company.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  {job.company.industry && <Chip>{job.company.industry}</Chip>}
                  {job.company.location && <Chip>{job.company.location}</Chip>}
                  {job.company.website && (
                    <a
                      href={job.company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/70 px-3 py-2 font-medium text-secondary-foreground transition-colors hover:text-primary"
                    >
                      Website <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border/70 bg-card p-5 card-shadow sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold">Requirements</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Mandatory gaps matter. “Obtainable later” creates a condition with a deadline.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold">
                {pluralise(job.requirements.length, "item")}
              </span>
            </div>

            <ul className="mt-4 space-y-2.5">
              {job.requirements.map((requirement) => {
                const row = breakdownById.get(requirement.id);
                return (
                  <li
                    key={requirement.id}
                    className={cn(
                      "rounded-xl border p-3.5",
                      row?.status === "matched" && "border-qualified/20 bg-qualified-soft/40",
                      row?.status === "partial" && "border-conditional/20 bg-conditional-soft/40",
                      row?.status === "missing" && "border-unqualified/15 bg-unqualified-soft/30",
                      !row && "border-border/70 bg-muted/20",
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      {row ? (
                        <RequirementStatusIcon status={row.status} />
                      ) : (
                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <CheckCircle2 className="size-3.5" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-[13px] font-semibold leading-snug">
                            {requirement.label}
                          </p>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              requirement.type === "MANDATORY" &&
                                "bg-foreground/5 text-foreground/70",
                              requirement.type === "OBTAINABLE_LATER" &&
                                "bg-conditional-soft text-conditional",
                              requirement.type === "PREFERRED" && "bg-secondary text-muted-foreground",
                            )}
                          >
                            {(REQUIREMENT_TYPE_LABEL[requirement.type] ?? requirement.type) +
                              ` · ${requirement.weight} pts`}
                          </span>
                          {requirement.groupId && <Chip tone="accent">OR alternative</Chip>}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {CATEGORY_LABEL[requirement.category] ?? requirement.category}
                          {requirement.gracePeriodDays
                            ? ` · obtainable within ${requirement.gracePeriodDays} days`
                            : ""}
                          {row ? ` · ${row.explanation}` : ""}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {match ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border/70 bg-card p-5 card-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Your match
                  </p>
                  <p className="mt-1 font-display text-lg font-extrabold">
                    {BUCKET_LABELS[match.bucket]}
                  </p>
                </div>
                <ScoreRing score={match.score} bucket={match.bucket} size={72} />
              </div>

              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {match.summary}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Matched", value: match.matched.length, tone: "text-qualified" },
                  { label: "Partial", value: match.partial.length, tone: "text-conditional" },
                  { label: "Missing", value: match.missing.length, tone: "text-unqualified" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-muted/50 px-2 py-2.5">
                    <p className={cn("font-display text-lg font-extrabold", item.tone)}>
                      {item.value}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>

              {match.conditions.length > 0 && (
                <div className="mt-4 rounded-xl border border-conditional/25 bg-conditional-soft p-3.5">
                  <div className="flex items-center gap-1.5">
                    <Clock3 className="size-3.5 text-conditional" />
                    <p className="text-[11px] font-bold text-conditional">Conditions to clear</p>
                  </div>
                  <ul className="mt-2 space-y-2">
                    {match.conditions.map((condition) => (
                      <li key={condition.requirementId} className="text-[11px] leading-relaxed">
                        <p className="font-semibold">{condition.label}</p>
                        <p className="text-muted-foreground">{condition.detail}</p>
                        {condition.deadline && (
                          <p className="mt-0.5 font-medium text-conditional">
                            By {formatDate(condition.deadline)}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {match.freshGradMode && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-accent/70 p-3 text-[11px] leading-relaxed text-accent-foreground">
                  <GraduationCap className="mt-0.5 size-3.5 shrink-0" />
                  Fresh-grad mode is active for this role. Experience counts less; education,
                  honors, OJT, and credentials count more.
                </div>
              )}
            </motion.div>
          ) : viewer?.user.role === "admin" ? (
            <div className="rounded-2xl border border-primary/15 bg-accent/60 p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <p className="font-display text-sm font-bold">Administrator view</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Applicant scores are private to the employer who owns this post.
                Use the moderation console for platform-level actions.
              </p>
              <Button asChild variant="outline" className="mt-3 h-10 w-full rounded-xl">
                <Link to="/app/admin">Open moderation console</Link>
              </Button>
            </div>
          ) : viewer?.user.role === "employer" ? (
            <div className="rounded-2xl border border-primary/15 bg-accent/60 p-5">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                <p className="font-display text-sm font-bold">You are browsing as an employer</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Applicant match scores appear inside your own pipeline once someone applies
                to one of your posts.
              </p>
              <Button asChild variant="outline" className="mt-3 h-10 w-full rounded-xl">
                <Link to="/app/employer/pipeline">Open your pipeline</Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/70 bg-card p-5 card-shadow">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <p className="font-display text-sm font-bold">See your match</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Add your skills, education, experience, and credentials to get a live
                requirement-level score for this role.
              </p>
              <Button asChild className="mt-3 h-10 w-full rounded-xl">
                <Link to="/app/profile">Complete profile</Link>
              </Button>
            </div>
          )}

          {viewer?.user.role === "applicant" && (
          <div className="rounded-2xl border border-border/70 bg-card p-5 card-shadow">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              What you&apos;re missing
            </p>
            {match && match.missing.length > 0 ? (
              <ul className="mt-2.5 space-y-2.5">
                {match.missing.map((row) => (
                  <li key={row.requirementId} className="flex items-start gap-2 text-xs">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-unqualified" />
                    <div>
                      <p className="font-semibold">{row.label}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                        {row.explanation}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : match ? (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Nothing mandatory is missing. Preferred gaps only trim the score.
              </p>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Complete your profile to see exactly which requirements you are missing.
              </p>
            )}
            {match && match.partial.length > 0 && (
              <>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Needs follow-up
                </p>
                <ul className="mt-2.5 space-y-2">
                  {match.partial.map((row) => (
                    <li key={row.requirementId} className="text-[11px] leading-relaxed">
                      <p className="font-semibold">{row.label}</p>
                      <p className="text-muted-foreground">{row.explanation}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          )}

          {job.company.contactEmail && (
            <p className="px-2 text-center text-[10px] leading-relaxed text-muted-foreground">
              Questions about the role? Contact{" "}
              <a
                className="underline underline-offset-2 hover:text-foreground"
                href={`mailto:${job.company.contactEmail}`}
              >
                {job.company.contactEmail}
              </a>
              .
            </p>
          )}
        </aside>
      </div>

      <ApplyDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        jobId={job._id}
        jobTitle={job.title}
        companyName={job.company.name}
        employerEmail={job.company.contactEmail}
        requirements={job.requirements as ScoringRequirement[]}
        match={match}
      />

      {applicant && (
        <StartConversationDialog
          open={messageOpen}
          onOpenChange={setMessageOpen}
          jobId={job._id}
          jobTitle={job.title}
          mode="applicant-to-employer"
        />
      )}
    </PageTransition>
  );
}
