import { useQuery } from "convex/react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clipboard,
  ClipboardCheck,
  FileText,
  Lightbulb,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { PageTransition } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

export default function ResumeStudio() {
  const jobs = useQuery(api.jobs.listOpen, {});
  const [jobId, setJobId] = useState<string>("");
  const selectedJobId = jobId ? (jobId as Id<"jobs">) : undefined;

  const review = useQuery(
    api.resume.review,
    selectedJobId ? { jobId: selectedJobId } : {},
  );
  const letter = useQuery(
    api.resume.coverLetter,
    selectedJobId ? { jobId: selectedJobId } : "skip",
  );
  const [copied, setCopied] = useState(false);

  async function copyLetter() {
    if (!letter) return;
    try {
      await navigator.clipboard.writeText(letter.body);
      setCopied(true);
      toast.success("Cover letter copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Your browser blocked clipboard access. Select and copy manually.");
    }
  }

  if (review === undefined) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-52 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded border border-border bg-card" />
      </div>
    );
  }

  if (!review.ready) {
    return (
      <PageTransition className="space-y-4">
        <header className="border-b border-border pb-4">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-ink">
            Resume studio
          </p>
          <h1 className="mt-1.5 font-display text-[1.7rem] font-extrabold leading-tight">
            {review.headline}
          </h1>
        </header>
        <div className="border border-border bg-card p-6 text-center">
          <FileText className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">No profile yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-muted-foreground">
            The resume assistant reads only your own Trabajalink profile. Add your
            skills, education, and resume file first.
          </p>
          <Button asChild className="mt-4 h-9 rounded-lg text-xs">
            <Link to="/app/profile?onboarding=1">Create my profile</Link>
          </Button>
        </div>
      </PageTransition>
    );
  }

  const failing = review.checks.filter((check) => check.status !== "pass");

  return (
    <PageTransition className="space-y-4">
      <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-ink">
            <Sparkles className="size-3" /> Resume studio
          </p>
          <h1 className="mt-1.5 font-display text-[1.7rem] font-extrabold leading-tight sm:text-[2rem]">
            Make your evidence easy to find.
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            An explainable review of your profile and resume, with the exact wording
            that closes each gap. Nothing here is invented — every point maps to data
            you can edit.
          </p>
        </div>
        <Button asChild variant="outline" className="h-9 rounded-lg px-3 text-xs">
          <Link to="/app/profile">Edit profile</Link>
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="border border-border bg-card p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Profile review
                </p>
                <p className="text-4xl leading-none text-primary">
                  <AnimatedNumber value={review.score} className="font-semibold" />
                  <span className="text-base font-semibold text-muted-foreground">
                    /100
                  </span>
                </p>
              </div>
              <div className="min-w-[140px] flex-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${review.score}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  {review.headline}
                </p>
              </div>
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  ATS readiness
                </p>
                <p className="font-display text-lg font-bold text-qualified">
                  {Math.round(review.atsScore)}%
                </p>
              </div>
            </div>
            {review.firstFix && (
              <div className="mt-3 flex items-start gap-2 border-l-2 border-gold bg-gold-soft/40 px-2.5 py-2 text-[11px] leading-relaxed">
                <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-gold-ink" />
                <span>
                  <span className="font-bold">Fastest win: </span>
                  {review.firstFix}
                </span>
              </div>
            )}
          </section>

          <section className="border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <h2 className="text-[13px] font-bold">Section checklist</h2>
              <span className="text-[10px] text-muted-foreground">
                {review.checks.length - failing.length}/{review.checks.length} passing
              </span>
            </div>
            <ul className="feed-divide">
              {review.checks.map((check) => (
                <li key={check.id} className="flex items-start gap-2.5 px-4 py-2.5">
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm",
                      check.status === "pass" && "bg-qualified-soft text-qualified",
                      check.status === "warn" && "bg-conditional-soft text-conditional",
                      check.status === "fail" && "bg-unqualified-soft text-unqualified",
                    )}
                  >
                    {check.status === "pass" ? (
                      <Check className="size-3" strokeWidth={3} />
                    ) : check.status === "warn" ? (
                      <AlertTriangle className="size-3" />
                    ) : (
                      <X className="size-3" strokeWidth={3} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold">{check.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {check.detail}
                    </p>
                    {check.fix && (
                      <p className="mt-1 text-[11px] leading-relaxed text-foreground">
                        <span className="font-semibold">Fix: </span>
                        {check.fix}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="border border-border bg-card p-4">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="size-3.5 text-gold-ink" />
              <h2 className="text-[13px] font-bold">Rewrite suggestions</h2>
            </div>
            <ul className="mt-2 space-y-1.5">
              {review.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2 text-[11.5px] leading-relaxed text-muted-foreground">
                  <span className="mt-1 size-1 shrink-0 rounded-full bg-gold" />
                  {bullet}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="border border-border bg-card p-4">
            <div className="flex items-center gap-1.5">
              <Target className="size-3.5 text-primary" />
              <h2 className="text-[13px] font-bold">Target a role</h2>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Pick a live role to compare its required keywords with your evidence and
              draft a matching cover letter.
            </p>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger className="mt-2.5 h-9 rounded-md text-[12px]" aria-label="Target role">
                <SelectValue placeholder="Choose a role" />
              </SelectTrigger>
              <SelectContent>
                {jobs?.map((job) => (
                  <SelectItem key={job._id} value={job._id}>
                    {job.title} — {job.company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {review.keywords && (
              <div className="mt-3 space-y-2.5">
                <div>
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-qualified">
                    <CheckCircle2 className="size-3" /> Already matched
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {review.keywords.matched.length === 0 ? (
                      <span className="text-[11px] text-muted-foreground">None yet</span>
                    ) : (
                      review.keywords.matched.map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-sm border border-qualified/25 bg-qualified-soft px-1.5 py-0.5 text-[10px] font-medium text-qualified"
                        >
                          {keyword}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-unqualified">
                    <X className="size-3" /> Missing keywords
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {review.keywords.missing.length === 0 ? (
                      <span className="text-[11px] text-muted-foreground">
                        Every requirement is represented.
                      </span>
                    ) : (
                      review.keywords.missing.map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                          {keyword}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {letter && (
            <section className="border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <h2 className="text-[13px] font-bold">Cover letter draft</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px]"
                  onClick={() => void copyLetter()}
                >
                  {copied ? (
                    <ClipboardCheck className="size-3" />
                  ) : (
                    <Clipboard className="size-3" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {letter.subject}
                </p>
                <pre className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap font-sans text-[11.5px] leading-relaxed text-foreground">
                  {letter.body}
                </pre>
                <p className="mt-2 border-t border-border pt-2 text-[10px] leading-relaxed text-muted-foreground">
                  Edit before sending. The draft only uses facts already on your
                  profile.
                </p>
              </div>
            </section>
          )}
        </aside>
      </div>
    </PageTransition>
  );
}
