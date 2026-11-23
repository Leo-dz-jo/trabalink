import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Award,
  BriefcaseBusiness,
  CalendarPlus,
  CheckCircle2,
  ExternalLink,
  FileText,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Save,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UserCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import {
  BucketBadge,
  Chip,
  RequirementStatusIcon,
  ScoreRing,
  StatusBadge,
} from "@/components/shared/badges";
import { ScheduleInterviewDialog } from "@/components/interviews/schedule-interview-dialog";
import { StartConversationDialog } from "@/components/messaging/start-conversation-dialog";
import { EmptyState, PageTransition } from "@/components/shared/page";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDate, timeAgo } from "@/lib/format";
import { BUCKET_LABELS } from "@/lib/scoring";
import { CATEGORY_LABEL, REQUIREMENT_TYPE_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function ApplicantDetail() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const detail = useQuery(
    api.applications.detail,
    applicationId ? { applicationId: applicationId as Id<"applications"> } : "skip",
  );
  const setStatus = useMutation(api.applications.setStatus);
  const saveNoteMutation = useMutation(api.applications.setNote);
  const [noteOverride, setNoteDraft] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [busyStatus, setBusyStatus] = useState<string | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  if (!applicationId) {
    return <EmptyState icon={FileText} title="Application not found" />;
  }

  if (detail === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl border border-border/70 bg-card" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="h-96 animate-pulse rounded-2xl border border-border/70 bg-card" />
          <div className="h-80 animate-pulse rounded-2xl border border-border/70 bg-card" />
        </div>
      </div>
    );
  }

  if (detail === null) {
    return (
      <EmptyState
        icon={FileText}
        title="This application is unavailable"
        description="It may have been removed, or the applicant deleted their profile."
      >
        <Button asChild variant="outline" className="h-10 rounded-xl">
          <Link to="/app/employer/pipeline">Back to pipeline</Link>
        </Button>
      </EmptyState>
    );
  }

  if (!detail.isEmployer) {
    return (
      <EmptyState
        icon={X}
        title="You do not have access to this application"
        description="Only the employer who received the application can review it."
      >
        <Button asChild className="h-10 rounded-xl">
          <Link to="/app/applications">My applications</Link>
        </Button>
      </EmptyState>
    );
  }

  const { applicant, application, score, job } = detail;
  // The draft starts from the saved note and only diverges once the employer types.
  const note = noteOverride ?? application.employerNote ?? "";

  async function changeStatus(status: "new" | "shortlisted" | "rejected" | "hired") {
    setBusyStatus(status);
    try {
      await setStatus({ applicationId: applicationId as Id<"applications">, status, note });
      toast.success(
        status === "shortlisted"
          ? "Applicant shortlisted."
          : status === "hired"
            ? "Marked as hired."
            : status === "rejected"
              ? "Applicant marked as not moving forward."
              : "Application moved back to new.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the status.");
    } finally {
      setBusyStatus(null);
    }
  }

  async function saveNote() {
    setSavingNote(true);
    try {
      await saveNoteMutation({ applicationId: applicationId as Id<"applications">, note });
      toast.success("Note saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the note.");
    } finally {
      setSavingNote(false);
    }
  }

  const answers = application.knockoutAnswers ?? {};
  const knockoutRequirements = job.requirements.filter(
    (requirement) => requirement.knockoutQuestion,
  );

  return (
    <PageTransition className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-9 rounded-lg text-muted-foreground">
        <Link to="/app/employer/pipeline">
          <ArrowLeft className="size-4" /> Pipeline
        </Link>
      </Button>

      <div className="rounded-2xl border border-border/70 bg-card p-5 card-shadow sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <UserAvatar name={applicant.fullName} src={applicant.photoUrl} className="size-16" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-extrabold tracking-[-0.03em]">
                  {applicant.fullName}
                </h1>
                <StatusBadge status={application.status} />
                {applicant.isFreshGrad && (
                  <Chip tone="accent">
                    <GraduationCap className="size-3" /> Fresh grad
                  </Chip>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {applicant.headline ?? "Applicant"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                {applicant.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" /> {applicant.location}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <BriefcaseBusiness className="size-3" /> {job.title}
                </span>
                <span>Applied {timeAgo(application.createdAt)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {applicant.email && (
                  <a
                    href={`mailto:${applicant.email}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[11px] font-semibold transition-colors hover:border-primary/30 hover:text-primary"
                  >
                    <Mail className="size-3.5" /> {applicant.email}
                  </a>
                )}
                {applicant.phone && (
                  <a
                    href={`tel:${applicant.phone}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[11px] font-semibold transition-colors hover:border-primary/30 hover:text-primary"
                  >
                    <Phone className="size-3.5" /> {applicant.phone}
                  </a>
                )}
                {applicant.resumeUrl && (
                  <a
                    href={applicant.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <FileText className="size-3.5" /> View resume
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-border/70 bg-muted/30 px-5 py-4">
            <ScoreRing score={score.score} bucket={score.bucket} size={84} />
            <BucketBadge bucket={score.bucket} />
            <p className="max-w-[190px] text-center text-[10px] leading-relaxed text-muted-foreground">
              {score.summary}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
          <Button
            size="sm"
            className="h-10 rounded-lg"
            onClick={() => void changeStatus("shortlisted")}
            disabled={busyStatus !== null || application.status === "shortlisted"}
          >
            {busyStatus === "shortlisted" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ThumbsUp className="size-3.5" />
            )}
            Shortlist
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-10 rounded-lg border-qualified/30 text-qualified hover:bg-qualified-soft"
            onClick={() => void changeStatus("hired")}
            disabled={busyStatus !== null || application.status === "hired"}
          >
            {busyStatus === "hired" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <UserCheck className="size-3.5" />
            )}
            Mark hired
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-10 rounded-lg border-primary/25 text-primary hover:bg-accent"
            onClick={() => setScheduleOpen(true)}
          >
            <CalendarPlus className="size-3.5" /> Schedule interview
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-10 rounded-lg"
            onClick={() => setMessageOpen(true)}
          >
            <MessageSquare className="size-3.5" /> Message applicant
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-10 rounded-lg text-destructive hover:bg-unqualified-soft hover:text-destructive"
            onClick={() => void changeStatus("rejected")}
            disabled={busyStatus !== null || application.status === "rejected"}
          >
            {busyStatus === "rejected" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ThumbsDown className="size-3.5" />
            )}
            Not moving forward
          </Button>
          <span className="ml-auto text-[10px] text-muted-foreground">
            Your note is saved with the decision.
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-border/70 bg-card p-5 card-shadow sm:p-6">
            <h2 className="font-display text-base font-bold">Score breakdown</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Weighted for {score.freshGradMode ? "fresh-grad mode" : "standard scoring"}.
              {score.freshGradMode
                ? " Experience weighs 15%; education and certifications weigh more."
                : " Requirements are checked against profile evidence only."}
            </p>

            <div className="mt-4 space-y-4">
              {[
                { title: "Matched", rows: score.matched, tone: "text-qualified" },
                { title: "Partially matched", rows: score.partial, tone: "text-conditional" },
                { title: "Missing", rows: score.missing, tone: "text-unqualified" },
              ].map((group) => (
                <div key={group.title}>
                  <div className="flex items-center justify-between">
                    <p className={cn("text-[11px] font-bold uppercase tracking-[0.12em]", group.tone)}>
                      {group.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {group.rows.length} item{group.rows.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {group.rows.length === 0 ? (
                    <p className="mt-1.5 rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                      None
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {group.rows.map((row) => (
                        <li
                          key={row.requirementId}
                          className="flex items-start gap-2.5 rounded-xl border border-border/60 p-3"
                        >
                          <RequirementStatusIcon status={row.status} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-[13px] font-semibold leading-snug">{row.label}</p>
                              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {(REQUIREMENT_TYPE_LABEL[row.type] ?? row.type) +
                                  ` · ${row.weight} pts`}
                              </span>
                              {row.alternative && <Chip tone="accent">OR group</Chip>}
                            </div>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                              {CATEGORY_LABEL[row.category] ?? row.category} · {row.explanation}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {score.conditions.length > 0 && (
              <div className="mt-4 rounded-xl border border-conditional/25 bg-conditional-soft p-4">
                <p className="text-[11px] font-bold text-conditional">Outstanding conditions</p>
                <ul className="mt-2 space-y-2">
                  {score.conditions.map((condition) => (
                    <li key={condition.requirementId} className="text-[11px] leading-relaxed">
                      <p className="font-semibold">{condition.label}</p>
                      <p className="text-muted-foreground">{condition.detail}</p>
                      {condition.deadline && (
                        <p className="font-medium text-conditional">
                          Deadline {formatDate(condition.deadline)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {knockoutRequirements.length > 0 && (
            <section className="rounded-2xl border border-border/70 bg-card p-5 card-shadow sm:p-6">
              <h2 className="font-display text-base font-bold">Screening answers</h2>
              <ul className="mt-3 space-y-2">
                {knockoutRequirements.map((requirement) => {
                  const answer = answers[requirement.id];
                  return (
                    <li
                      key={requirement.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-border/60 p-3"
                    >
                      <p className="text-xs leading-relaxed">{requirement.knockoutQuestion}</p>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          answer === "yes"
                            ? "bg-qualified-soft text-qualified"
                            : "bg-unqualified-soft text-unqualified",
                        )}
                      >
                        {answer ?? "No answer"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {application.coverNote && (
            <section className="rounded-2xl border border-border/70 bg-card p-5 card-shadow sm:p-6">
              <h2 className="font-display text-base font-bold">Note from the applicant</h2>
              <p className="mt-2 whitespace-pre-line rounded-xl bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
                {application.coverNote}
              </p>
            </section>
          )}

          <section className="rounded-2xl border border-border/70 bg-card p-5 card-shadow sm:p-6">
            <h2 className="font-display text-base font-bold">Profile evidence</h2>

            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Summary
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {applicant.bio ?? "No bio provided."}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {applicant.skills.map((skill) => (
                  <Chip key={skill} tone="accent">
                    {skill}
                  </Chip>
                ))}
                {applicant.skills.length === 0 && (
                  <span className="text-[11px] text-muted-foreground">No skills listed.</span>
                )}
              </div>
            </div>

            <div className="mt-5 border-t border-border/60 pt-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="size-4 text-primary" />
                <p className="text-xs font-bold">Education</p>
              </div>
              {applicant.education.length === 0 ? (
                <p className="mt-1.5 text-[11px] text-muted-foreground">No education entries.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {applicant.education.map((entry) => (
                    <li key={entry.id} className="rounded-xl bg-muted/40 p-3">
                      <p className="text-xs font-semibold">{entry.course}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {entry.school}
                        {entry.yearGraduated ? ` · ${entry.yearGraduated}` : ""}
                        {entry.honors ? ` · ${entry.honors}` : ""}
                        {entry.gpa ? ` · GPA ${entry.gpa}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-5 border-t border-border/60 pt-4">
              <div className="flex items-center gap-2">
                <BriefcaseBusiness className="size-4 text-primary" />
                <p className="text-xs font-bold">Experience & OJT</p>
              </div>
              {applicant.experience.length === 0 ? (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  No experience entries — check OJT and capstone evidence in the resume.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {applicant.experience.map((entry) => (
                    <li key={entry.id} className="rounded-xl bg-muted/40 p-3">
                      <p className="text-xs font-semibold">
                        {entry.title} · {entry.company}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {entry.startYear}–{entry.endYear ?? "present"}
                      </p>
                      {entry.description && (
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          {entry.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-5 border-t border-border/60 pt-4">
              <div className="flex items-center gap-2">
                <Award className="size-4 text-primary" />
                <p className="text-xs font-bold">Certifications & licenses</p>
              </div>
              {applicant.certifications.length === 0 ? (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  No credentials on file.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {applicant.certifications.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-start justify-between gap-3 rounded-xl bg-muted/40 p-3"
                    >
                      <div>
                        <p className="text-xs font-semibold">{entry.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {entry.issuer ?? "Issuer not stated"}
                          {entry.date ? ` · ${entry.date}` : ""}
                          {entry.expiry ? ` · expires ${entry.expiry}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-card px-2 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                        {entry.status.replace("_", " ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {(applicant.github || applicant.linkedin || applicant.portfolio) && (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-border/60 pt-4">
                {[
                  { label: "GitHub", href: applicant.github },
                  { label: "LinkedIn", href: applicant.linkedin },
                  { label: "Portfolio", href: applicant.portfolio },
                ]
                  .filter((link) => Boolean(link.href))
                  .map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium transition-colors hover:border-primary/30 hover:text-primary"
                    >
                      {link.label} <ExternalLink className="size-3" />
                    </a>
                  ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/70 bg-card p-5 card-shadow"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h2 className="font-display text-sm font-bold">Recommendation</h2>
            </div>
            <p className="mt-2 text-sm font-semibold">{BUCKET_LABELS[score.bucket]}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {score.summary} Trabalink recommends based on evidence; you decide.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <BucketBadge bucket={score.bucket} compact />
              {score.conditions.length > 0 && (
                <Chip tone="warm">
                  {score.conditions.length} condition{score.conditions.length === 1 ? "" : "s"}
                </Chip>
              )}
              {score.freshGradMode && <Chip tone="accent">Fresh-grad mode</Chip>}
            </div>
            <div className="mt-4 rounded-xl bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
              Overriding the bucket? Use the note below to record why. Every decision stays
              attached to the application.
            </div>
          </motion.div>

          <div className="rounded-2xl border border-border/70 bg-card p-5 card-shadow">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold">Internal note</h2>
              <span className="text-[10px] text-muted-foreground">
                Only your team sees this
              </span>
            </div>
            <Textarea
              value={note}
              onChange={(event) => setNoteDraft(event.target.value)}
              rows={5}
              placeholder="e.g. Strong portfolio. License exam is in April — follow up after the results."
              className="mt-2.5 rounded-xl text-sm"
              maxLength={1000}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{note.length}/1000</span>
              <Button
                size="sm"
                className="h-9 rounded-lg"
                onClick={() => void saveNote()}
                disabled={savingNote}
              >
                {savingNote ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                Save note
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-5 card-shadow">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              <h2 className="font-display text-sm font-bold">Decision log</h2>
            </div>
            <ul className="mt-2.5 space-y-2 text-[11px] text-muted-foreground">
              <li className="flex items-center justify-between gap-2">
                <span>Applied</span>
                <span className="font-medium text-foreground">
                  {formatDate(application.createdAt)}
                </span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>Current status</span>
                <StatusBadge status={application.status} />
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>Resume</span>
                <span className="font-medium text-foreground">
                  {applicant.resumeName ?? (applicant.resumeUrl ? "On file" : "Not uploaded")}
                </span>
              </li>
            </ul>
          </div>

          <p className="px-2 text-center text-[10px] leading-relaxed text-muted-foreground">
            Applicant data is confidential and shared under RA 10173 consent. Do not
            forward it outside your hiring team.
          </p>
        </aside>
      </div>

      <StartConversationDialog
        open={messageOpen}
        onOpenChange={setMessageOpen}
        jobId={job._id}
        jobTitle={job.title}
        applicantId={applicant.userId}
        mode="employer-to-applicant"
      />

      <ScheduleInterviewDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        applicationId={applicationId as Id<"applications">}
        applicantName={applicant.fullName}
        jobTitle={job.title}
      />
    </PageTransition>
  );
}
