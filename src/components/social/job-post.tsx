import type { FunctionReturnType } from "convex/server";
import { useMutation } from "convex/react";
import { motion } from "framer-motion";
import {
  Banknote,
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { FollowButton } from "@/components/social/follow-button";
import { BucketBadge, Chip, ScoreRing } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { formatSalary, pluralise, timeAgo } from "@/lib/format";
import type { QualificationResult } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export type FeedJob = FunctionReturnType<typeof api.network.feed>[number];

/**
 * A job post rendered as a feed entry: company identity and a follow control
 * on top, the role itself as the body, and a single action row underneath.
 * Deliberately flat — no nested cards or oversized chrome.
 */
export function JobPost({
  job,
  match,
  index = 0,
  showFollow = true,
}: {
  job: FeedJob;
  match?: QualificationResult;
  index?: number;
  showFollow?: boolean;
}) {
  const toggleSaved = useMutation(api.network.toggleSaved);
  const [saved, setSaved] = useState(job.saved);
  const [busy, setBusy] = useState(false);
  // Captured once per mount so rendering never reads the clock directly.
  const [now] = useState(() => Date.now());
  const closingSoon =
    job.deadline !== undefined &&
    job.deadline - now < 7 * 24 * 60 * 60 * 1000;

  async function handleSave() {
    setBusy(true);
    try {
      const result = await toggleSaved({ jobId: job._id });
      setSaved(result.saved);
      toast.success(result.saved ? "Saved to your list." : "Removed from saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this role.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.24) }}
      className="group relative px-4 py-4 sm:px-5"
    >
      <header className="flex items-start gap-3">
        <Link
          to={`/app/jobs/${job._id}`}
          className="shrink-0 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {job.company.logoUrl ? (
            <img
              src={job.company.logoUrl}
              alt=""
              className="size-11 rounded-lg border border-border object-cover"
            />
          ) : (
            <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 font-display text-sm font-bold text-primary">
              {job.company.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="truncate text-[13px] font-bold">
              {job.company.name}
            </span>
            {job.following && (
              <span className="rounded-full bg-accent px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-accent-foreground">
                Following
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">
              · {timeAgo(job.createdAt)}
            </span>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
            <span>{job.company.industry ?? "Hiring now"}</span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3" /> {job.followerCount} follower
              {job.followerCount === 1 ? "" : "s"}
            </span>
            {job.employerOpenRoles > 0 && (
              <span>· {pluralise(job.employerOpenRoles, "open role")}</span>
            )}
          </p>
        </div>

        {showFollow && (
          <FollowButton employerId={job.employerId} following={job.following} size="xs" />
        )}
      </header>

      <Link
        to={`/app/jobs/${job._id}`}
        className="mt-3 block rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[17px] font-bold leading-snug transition-colors group-hover:text-primary">
              {job.title}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
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
          {match && (
            <ScoreRing
              score={match.score}
              bucket={match.bucket}
              size={46}
              strokeWidth={4}
              showMax={false}
              className="shrink-0"
            />
          )}
        </div>

        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
          {job.description}
        </p>
      </Link>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {job.isEntryLevel && <Chip tone="accent">Entry level</Chip>}
        {job.isRemote && <Chip>Remote</Chip>}
        {job.hasApplied && (
          <Chip tone="accent">
            <CheckCircle2 className="size-3" /> Applied
          </Chip>
        )}
        {closingSoon && (
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

      {match && (
        <div className="mt-2.5 flex items-start gap-2 border-l-2 border-gold/60 bg-gold-soft/40 px-2.5 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <Sparkles className="mt-0.5 size-3 shrink-0 text-gold-ink" />
          <span>{match.summary}</span>
        </div>
      )}

      <footer className="mt-3 flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={busy}
          className={cn(
            "h-9 rounded-md px-3 text-[11px] font-semibold",
            saved && "text-primary",
          )}
          aria-pressed={saved}
        >
          {saved ? (
            <BookmarkCheck className="size-3.5" />
          ) : (
            <Bookmark className="size-3.5" />
          )}
          {saved ? "Saved" : "Save"}
        </Button>
        <Button asChild variant="ghost" size="sm" className="h-9 rounded-md px-3 text-[11px] font-semibold">
          <Link to={`/app/jobs/${job._id}`}>View role</Link>
        </Button>
        <Button
          asChild
          size="sm"
          className="ml-auto h-9 rounded-md px-3.5 text-[11px]"
        >
          <Link to={`/app/jobs/${job._id}`}>
            {job.hasApplied ? "View application" : "Apply"}
          </Link>
        </Button>
      </footer>
    </motion.article>
  );
}

export function JobPostSkeleton() {
  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="flex gap-3">
        <div className="size-11 animate-pulse rounded-lg bg-muted" />
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
