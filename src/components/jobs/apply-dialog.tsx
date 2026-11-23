import { useMutation } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowRight, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BucketBadge, ScoreRing } from "@/components/shared/badges";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { sendApplicationEmails } from "@/lib/email";
import {
  BUCKET_LABELS,
  type QualificationBucket,
  type QualificationResult,
  type ScoringRequirement,
} from "@/lib/scoring";

export function ApplyDialog({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  companyName,
  employerEmail,
  requirements,
  match,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: Id<"jobs">;
  jobTitle: string;
  companyName: string;
  employerEmail?: string;
  requirements: ScoringRequirement[];
  match?: QualificationResult;
}) {
  const apply = useMutation(api.applications.apply);
  const { user } = useAuth();
  const [coverNote, setCoverNote] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    bucket: QualificationBucket;
    score: number;
    summary: string;
  } | null>(null);

  const knockoutRequirements = requirements.filter(
    (requirement) => requirement.knockoutQuestion,
  );

  async function submit() {
    setError(null);
    const missingAnswer = knockoutRequirements.find((requirement) => !answers[requirement.id]);
    if (missingAnswer) {
      setError("Please answer every screening question before applying.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await apply({
        jobId,
        coverNote: coverNote.trim() || undefined,
        knockoutAnswers:
          Object.keys(answers).length > 0 ? answers : undefined,
      });
      setResult(response);
      toast.success("Application sent. The hiring team will review it personally.");
      void sendApplicationEmails({
        applicantName: user?.name ?? "Applicant",
        applicantEmail: user?.email ?? undefined,
        employerEmail,
        companyName,
        jobTitle,
        score: response.score,
        bucketLabel: BUCKET_LABELS[response.bucket],
        conditions: match?.conditions.length ?? 0,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not submit your application.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setCoverNote("");
    setAnswers({});
    setError(null);
    setResult(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90svh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <AnimatePresence mode="wait" initial={false}>
          {result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-2 text-center"
            >
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-qualified-soft text-qualified">
                <Sparkles className="size-6" />
              </div>
              <h2 className="mt-4 font-display text-xl font-extrabold">Application sent</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {companyName} received your profile, resume, and score breakdown.
              </p>
              <div className="mt-5 flex items-center justify-center gap-4 rounded-2xl border border-border/70 bg-muted/40 p-4">
                <ScoreRing score={result.score} bucket={result.bucket} size={64} />
                <div className="text-left">
                  <BucketBadge bucket={result.bucket} />
                  <p className="mt-1.5 max-w-[220px] text-[11px] leading-relaxed text-muted-foreground">
                    {result.summary}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                This score is a recommendation. A person on the hiring team makes the
                final call — nothing is auto-rejected.
              </p>
              <DialogFooter className="mt-5 sm:justify-center">
                <Button
                  variant="outline"
                  className="h-11 rounded-xl"
                  onClick={() => {
                    reset();
                    onOpenChange(false);
                  }}
                >
                  Close
                </Button>
              </DialogFooter>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <DialogHeader>
                <DialogTitle className="font-display text-xl font-extrabold">
                  Apply to {jobTitle}
                </DialogTitle>
                <DialogDescription>
                  {companyName} will see your profile, resume, and the same match
                  breakdown you see here.
                </DialogDescription>
              </DialogHeader>

              {match && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-border/70 bg-muted/40 p-3">
                  <ScoreRing score={match.score} bucket={match.bucket} size={48} showMax={false} />
                  <div className="min-w-0">
                    <BucketBadge bucket={match.bucket} compact />
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                      {match.conditions.length > 0
                        ? `${match.conditions.length} condition${
                            match.conditions.length === 1 ? "" : "s"
                          } will be tracked after applying.`
                        : "No outstanding conditions on your current profile."}
                    </p>
                  </div>
                </div>
              )}

              {knockoutRequirements.length > 0 && (
                <div className="mt-5 space-y-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Screening questions
                  </p>
                  {knockoutRequirements.map((requirement) => (
                    <div key={requirement.id} className="rounded-xl border border-border/70 p-3.5">
                      <Label className="text-[13px] font-semibold leading-snug">
                        {requirement.knockoutQuestion}
                      </Label>
                      <RadioGroup
                        className="mt-2.5 flex gap-4"
                        value={answers[requirement.id] ?? ""}
                        onValueChange={(value) =>
                          setAnswers((previous) => ({ ...previous, [requirement.id]: value }))
                        }
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="yes" id={`${requirement.id}-yes`} />
                          <Label htmlFor={`${requirement.id}-yes`} className="text-sm font-normal">
                            Yes
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="no" id={`${requirement.id}-no`} />
                          <Label htmlFor={`${requirement.id}-no`} className="text-sm font-normal">
                            No
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5">
                <Label htmlFor="coverNote" className="text-[13px] font-semibold">
                  Note to the hiring team <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="coverNote"
                  rows={4}
                  value={coverNote}
                  onChange={(event) => setCoverNote(event.target.value)}
                  maxLength={2000}
                  className="mt-1.5 rounded-xl"
                  placeholder="Anything they should know — availability, a relevant project, or your license timeline."
                />
                <p className="mt-1 text-right text-[10px] text-muted-foreground">
                  {coverNote.length}/2000
                </p>
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-3 flex items-start gap-2 rounded-xl border border-unqualified/20 bg-unqualified-soft px-3 py-2 text-xs text-unqualified"
                >
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" /> {error}
                </p>
              )}

              <p className="mt-4 flex items-start gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
                Your application is shared only with this employer. You can withdraw by
                deleting your profile data.
              </p>

              <DialogFooter className="mt-5 gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  className="h-11 rounded-xl"
                  onClick={() => onOpenChange(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  className="h-11 rounded-xl"
                  onClick={() => void submit()}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      Send application <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
