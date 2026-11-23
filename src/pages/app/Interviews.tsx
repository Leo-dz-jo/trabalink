import { useMutation, useQuery } from "convex/react";
import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  MapPin,
  Phone,
  Star,
  Video,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { EmptyState, PageTransition } from "@/components/shared/page";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useViewer } from "@/hooks/use-viewer";
import { cn } from "@/lib/utils";

const MODE_ICON = {
  onsite: MapPin,
  video: Video,
  phone: Phone,
} as const;

const MODE_LABEL = {
  onsite: "On-site",
  video: "Video call",
  phone: "Phone call",
} as const;

function formatSlot(value: number) {
  return new Date(value).toLocaleString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Interviews() {
  const { role } = useViewer();
  if (role === "employer") return <EmployerInterviews />;
  return <ApplicantInterviews />;
}

function StatusPill({ status }: { status: "scheduled" | "completed" | "cancelled" }) {
  const styles = {
    scheduled: "border-primary/20 bg-accent text-accent-foreground",
    completed: "border-qualified/25 bg-qualified-soft text-qualified",
    cancelled: "border-border bg-muted text-muted-foreground",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.06em]",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

function EmployerInterviews() {
  const rows = useQuery(api.interviews.forEmployer);
  const updateStatus = useMutation(api.interviews.updateStatus);
  const [reviewTarget, setReviewTarget] = useState<{
    _id: Id<"interviews">;
    name: string;
    jobTitle: string;
  } | null>(null);

  // Captured once per mount so rendering never reads the clock directly.
  const [now] = useState(() => Date.now());
  const upcoming = (rows ?? [])
    .filter((row) => row.status === "scheduled" && row.scheduledAt >= now)
    .sort((a, b) => a.scheduledAt - b.scheduledAt);
  const history = (rows ?? [])
    .filter((row) => row.status !== "scheduled" || row.scheduledAt < now)
    .sort((a, b) => b.scheduledAt - a.scheduledAt);

  async function cancel(id: Id<"interviews">) {
    try {
      await updateStatus({ interviewId: id, status: "cancelled" });
      toast.success("Interview cancelled. The applicant was notified.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel.");
    }
  }

  return (
    <PageTransition className="space-y-4">
      <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-ink">
            Hiring schedule
          </p>
          <h1 className="mt-1.5 font-display text-[1.7rem] font-extrabold leading-tight sm:text-[2rem]">
            Interviews
          </h1>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
            Book slots straight from an applicant's review page. Candidates are
            notified instantly and see the venue or meeting link.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-9 rounded-lg px-3 text-xs">
            <Link to="/app/employer/pipeline">
              <CalendarPlus className="size-3.5" /> Schedule from pipeline
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: "Upcoming", value: upcoming.length, tone: "text-primary" },
          {
            label: "Completed",
            value: (rows ?? []).filter((row) => row.status === "completed").length,
            tone: "text-qualified",
          },
          {
            label: "Cancelled",
            value: (rows ?? []).filter((row) => row.status === "cancelled").length,
            tone: "text-muted-foreground",
          },
        ].map((stat) => (
          <div key={stat.label} className="border border-border bg-card px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {stat.label}
            </p>
            <p className={cn("mt-1 font-display text-xl font-extrabold", stat.tone)}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <section className="border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <CalendarClock className="size-4 text-primary" />
          <h2 className="text-[13px] font-bold">Upcoming</h2>
          <span className="ml-auto text-[10px] text-muted-foreground">
            Times shown in your local timezone
          </span>
        </div>
        {rows === undefined ? (
          <div className="space-y-2 p-4">
            {[0, 1].map((index) => (
              <div key={index} className="h-16 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No interviews scheduled"
            description="Open an applicant in the pipeline and choose Schedule interview to book a date, time, and format."
            className="border-0 bg-transparent"
          >
            <Button asChild variant="outline" className="h-9 rounded-lg text-xs">
              <Link to="/app/employer/pipeline">Open pipeline</Link>
            </Button>
          </EmptyState>
        ) : (
          <ul className="feed-divide">
            {upcoming.map((row) => {
              const Icon = MODE_ICON[row.mode];
              return (
                <li key={row._id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <UserAvatar
                      name={row.applicant.name}
                      src={row.applicant.photoUrl}
                      className="size-9"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          to={`/app/employer/applications/${row.applicationId}`}
                          className="truncate text-[13px] font-bold hover:text-primary hover:underline"
                        >
                          {row.applicant.name}
                        </Link>
                        <StatusPill status={row.status} />
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {row.jobTitle}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                        <span className="inline-flex items-center gap-1 font-medium text-primary">
                          <Clock3 className="size-3" /> {formatSlot(row.scheduledAt)}
                        </span>
                        <span className="text-muted-foreground">
                          {row.durationMinutes} min
                        </span>
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Icon className="size-3" /> {MODE_LABEL[row.mode]}
                        </span>
                      </p>
                      {row.location && (
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {row.location}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
                    {row.meetingLink && (
                      <Button asChild variant="outline" size="sm" className="h-8 rounded-md px-2.5 text-[11px]">
                        <a href={row.meetingLink} target="_blank" rel="noopener noreferrer">
                          Join <ExternalLink className="size-3" />
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="h-8 rounded-md px-2.5 text-[11px]"
                      onClick={() =>
                        setReviewTarget({
                          _id: row._id,
                          name: row.applicant.name,
                          jobTitle: row.jobTitle,
                        })
                      }
                    >
                      <CheckCircle2 className="size-3" /> Complete
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-md px-2 text-[11px] text-destructive hover:bg-unqualified-soft hover:text-destructive"
                      onClick={() => void cancel(row._id)}
                    >
                      Cancel
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="border border-border bg-card">
        <div className="border-b border-border px-4 py-2.5">
          <h2 className="text-[13px] font-bold">History</h2>
        </div>
        {rows === undefined ? (
          <div className="h-20 animate-pulse bg-muted/40" />
        ) : history.length === 0 ? (
          <p className="px-4 py-4 text-[11px] text-muted-foreground">
            Completed and cancelled interviews will be listed here.
          </p>
        ) : (
          <ul className="feed-divide">
            {history.map((row) => (
              <li key={row._id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold">
                    {row.applicant.name} · {row.jobTitle}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatSlot(row.scheduledAt)} · {row.durationMinutes} min
                  </p>
                  {row.feedback && (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                      “{row.feedback}”
                    </p>
                  )}
                </div>
                {row.rating && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-conditional">
                    <Star className="size-3 fill-current" /> {row.rating}/5
                  </span>
                )}
                <StatusPill status={row.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {reviewTarget && (
        <ReviewDialog
          target={reviewTarget}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </PageTransition>
  );
}

function ReviewDialog({
  target,
  onClose,
}: {
  target: { _id: Id<"interviews">; name: string; jobTitle: string };
  onClose: () => void;
}) {
  const review = useMutation(api.interviews.review);
  const [rating, setRating] = useState(4);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await review({ interviewId: target._id, rating, feedback });
      toast.success("Interview scorecard saved.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Interview scorecard</DialogTitle>
          <DialogDescription>
            {target.name} · {target.jobTitle}. Private to your hiring team.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-md border text-[11px] font-bold transition-colors",
                    rating >= value
                      ? "border-conditional/40 bg-conditional-soft text-conditional"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Star className={cn("size-4", rating >= value && "fill-current")} />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="feedback" className="text-xs font-semibold">
              Notes on the interview
            </Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Evidence from the conversation, strengths, and open questions."
              className="text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Save scorecard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApplicantInterviews() {
  const rows = useQuery(api.interviews.forApplicant);
  // Captured once per mount so rendering never reads the clock directly.
  const [now] = useState(() => Date.now());
  const upcoming = (rows ?? [])
    .filter((row) => row.status === "scheduled" && row.scheduledAt >= now)
    .sort((a, b) => a.scheduledAt - b.scheduledAt);
  const past = (rows ?? [])
    .filter((row) => row.status !== "scheduled" || row.scheduledAt < now)
    .sort((a, b) => b.scheduledAt - a.scheduledAt);

  return (
    <PageTransition className="space-y-4">
      <header className="border-b border-border pb-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-ink">
          Your calendar
        </p>
        <h1 className="mt-1.5 font-display text-[1.7rem] font-extrabold leading-tight sm:text-[2rem]">
          Interviews
        </h1>
        <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
          Everything an employer books appears here with the date, time, format, and
          any preparation notes.
        </p>
      </header>

      <section className="border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <CalendarClock className="size-4 text-primary" />
          <h2 className="text-[13px] font-bold">Upcoming</h2>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {upcoming.length} booked
          </span>
        </div>
        {rows === undefined ? (
          <div className="space-y-2 p-4">
            {[0, 1].map((index) => (
              <div key={index} className="h-16 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No interviews booked yet"
            description="Keep your profile and resume current — employers schedule from your application."
            className="border-0 bg-transparent"
          >
            <Button asChild variant="outline" className="h-9 rounded-lg text-xs">
              <Link to="/app/applications">View applications</Link>
            </Button>
          </EmptyState>
        ) : (
          <ul className="feed-divide">
            {upcoming.map((row) => {
              const Icon = MODE_ICON[row.mode];
              return (
                <li key={row._id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <StatusPill status={row.status} />
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {row.companyName}
                        </span>
                      </div>
                      <p className="mt-1 text-[14px] font-bold">{row.jobTitle}</p>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-primary">
                        <Clock3 className="size-3.5" /> {formatSlot(row.scheduledAt)} ·{" "}
                        {row.durationMinutes} min
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Icon className="size-3" /> {MODE_LABEL[row.mode]}
                        {row.location ? ` · ${row.location}` : ""}
                      </p>
                      {row.notes && (
                        <p className="mt-2 border-l-2 border-gold/50 bg-gold-soft/40 px-2.5 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
                          {row.notes}
                        </p>
                      )}
                    </div>
                    {row.meetingLink && (
                      <Button asChild size="sm" className="h-8 rounded-md px-2.5 text-[11px]">
                        <a href={row.meetingLink} target="_blank" rel="noopener noreferrer">
                          Join call <ExternalLink className="size-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="border border-border bg-card">
        <div className="border-b border-border px-4 py-2.5">
          <h2 className="text-[13px] font-bold">Past interviews</h2>
        </div>
        {rows === undefined ? (
          <div className="h-16 animate-pulse bg-muted/40" />
        ) : past.length === 0 ? (
          <p className="px-4 py-4 text-[11px] text-muted-foreground">
            Nothing in your history yet.
          </p>
        ) : (
          <ul className="feed-divide">
            {past.map((row) => (
              <li key={row._id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold">
                    {row.jobTitle} · {row.companyName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatSlot(row.scheduledAt)}
                  </p>
                </div>
                {row.status === "completed" ? (
                  <CheckCircle2 className="size-4 text-qualified" />
                ) : (
                  <XCircle className="size-4 text-muted-foreground" />
                )}
                <StatusPill status={row.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageTransition>
  );
}
