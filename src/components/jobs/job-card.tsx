import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Banknote,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router";
import { BucketBadge, Chip, ScoreRing } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { formatSalary, pluralise, timeAgo } from "@/lib/format";
import type { QualificationResult } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export type JobRow = FunctionReturnType<typeof api.jobs.listOpen>[number];

export function JobCard({
  job,
  match,
  index = 0,
  hasApplied = false,
}: {
  job: JobRow;
  match?: QualificationResult;
  index?: number;
  hasApplied?: boolean;
}) {
  // Captured once per mount so rendering never reads the clock directly.
  const [now] = useState(() => Date.now());
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
    >
      <Link
        to={`/app/jobs/${job._id}`}
        className="group block h-full rounded-2xl border border-border/70 bg-card p-5 card-shadow transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:card-shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <div className="flex items-start gap-3">
          {job.company.logoUrl ? (
            <img
              src={job.company.logoUrl}
              alt={`${job.company.name} logo`}
              className="size-11 shrink-0 rounded-xl border border-border object-cover"
            />
          ) : (
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-sm font-extrabold text-accent-foreground">
              {job.company.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {job.company.name}
            </p>
            <h3 className="mt-1 font-display text-[15px] font-bold leading-snug transition-colors group-hover:text-primary">
              {job.title}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {job.isRemote ? "Remote" : job.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <BriefcaseBusiness className="size-3" />
                {job.employmentType}
              </span>
              <span className="inline-flex items-center gap-1">
                <Banknote className="size-3" />
                {formatSalary(job.salaryMin, job.salaryMax)}
              </span>
            </div>
          </div>
          {match ? (
            <ScoreRing score={match.score} bucket={match.bucket} size={52} showMax={false} />
          ) : (
            <span className="hidden shrink-0 rounded-lg bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground sm:block">
              {timeAgo(job.createdAt)}
            </span>
          )}
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          {job.isEntryLevel && <Chip tone="accent">Entry level</Chip>}
          {job.isRemote && <Chip>Remote</Chip>}
          {hasApplied && (
            <Chip tone="accent">
              <CheckCircle2 className="size-3" /> Applied
            </Chip>
          )}
          {job.deadline && job.deadline - now < 7 * 24 * 60 * 60 * 1000 && (
            <Chip tone="warm">
              <CalendarClock className="size-3" /> Closing soon
            </Chip>
          )}
          {match ? (
            <BucketBadge bucket={match.bucket} compact />
          ) : (
            <Chip>{pluralise(job.requirements.length, "requirement")}</Chip>
          )}
        </div>

        <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
          <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
            {match
              ? match.summary
              : job.requirements
                  .slice(0, 3)
                  .map((requirement) => requirement.label)
                  .join(" · ")}
          </p>
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-primary">
            {match ? (
              <>
                <Sparkles className="size-3" /> {match.score}% match
              </>
            ) : (
              "View role →"
            )}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

export function JobCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card p-5", className)}>
      <div className="flex gap-3">
        <div className="size-11 animate-pulse rounded-xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-2.5 w-1/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 h-2.5 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}

export function ApplyButton({
  applied,
  closed,
  onClick,
}: {
  applied: boolean;
  closed: boolean;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick} disabled={applied || closed} size="lg" className="h-12 rounded-xl px-6">
      {applied ? "Application sent" : closed ? "Applications closed" : "Apply to this role"}
    </Button>
  );
}
