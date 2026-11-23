import { useMutation } from "convex/react";
import { ArrowRight, Loader2, MessageSquare, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
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

export function StartConversationDialog({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  applicantId,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: Id<"jobs">;
  jobTitle: string;
  applicantId?: Id<"users">;
  mode: "applicant-to-employer" | "employer-to-applicant";
}) {
  const start = useMutation(api.conversations.start);
  const navigate = useNavigate();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Cleared on close so a reopened dialog never sends a stale draft. */
  function resetDraft() {
    setBody("");
    setError(null);
  }

  async function submit() {
    if (body.trim().length < 2) {
      setError("Write a short message before sending.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const conversationId = await start({
        jobId,
        applicantId,
        body,
      });
      toast.success("Conversation started.");
      onOpenChange(false);
      navigate(`/app/messages/${conversationId}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not send the message.",
      );
    } finally {
      setSending(false);
    }
  }

  const isApplicant = mode === "applicant-to-employer";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetDraft();
        onOpenChange(next);
      }}
    >
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <MessageSquare className="size-5" />
          </div>
          <DialogTitle className="font-display text-xl font-extrabold">
            {isApplicant ? "Message the hiring team" : "Message this applicant"}
          </DialogTitle>
          <DialogDescription>
            {isApplicant
              ? `Start a conversation about ${jobTitle}. Your message is shared only with this employer.`
              : `Open a private conversation with this candidate about ${jobTitle}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <Label htmlFor="first-message" className="text-[13px] font-semibold">
            Your message
          </Label>
          <Textarea
            id="first-message"
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            placeholder={
              isApplicant
                ? "Introduce yourself and ask about the role, timeline, or requirements."
                : "Ask about availability, their portfolio, or the next step in your process."
            }
            className="mt-1.5 rounded-xl"
            disabled={sending}
          />
          <p className="mt-1 text-right text-[10px] text-muted-foreground">
            {body.length}/2000
          </p>
        </div>

        {error && (
          <p className="rounded-xl border border-unqualified/20 bg-unqualified-soft px-3 py-2 text-xs text-unqualified">
            {error}
          </p>
        )}

        <p className="flex items-start gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
          Keep conversations about the role. Administrators cannot read private messages.
        </p>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            className="h-11 rounded-xl"
            onClick={() => void submit()}
            disabled={sending}
          >
            {sending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Sending…
              </>
            ) : (
              <>
                Send message <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
