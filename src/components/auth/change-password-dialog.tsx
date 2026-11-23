import { useAuthActions } from "@convex-dev/auth/react";
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordProblem } from "@/lib/password";

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (
    /no account|not found|invalid credentials|invalidsecret|invalid secret/i.test(
      message,
    )
  ) {
    return "This account does not have a password yet. Use Create account with the same verified email to add one.";
  }
  if (/code|expired/i.test(message)) {
    return "That code is incorrect or has expired. Send a new one.";
  }
  if (/at least 8|letter and one number/i.test(message)) return message;
  if (/rate|too many|limit/i.test(message)) {
    return "Too many attempts. Wait a minute, then try again.";
  }
  if (/could not send|integration_key|http/i.test(message)) {
    return "We could not send the verification email. Try again in a moment.";
  }
  return "We could not update your password. Please try again.";
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  email,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
}) {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const timerRef = useRef<number | null>(null);

  /** Cleared on close so a reopened dialog never shows a stale step or code. */
  function resetDraft() {
    setStep("request");
    setOtp("");
    setNewPassword("");
    setConfirm("");
    setShowPassword(false);
    setSubmitting(false);
    setError(null);
    setNotice(null);
    setResendIn(0);
  }

  useEffect(() => {
    if (resendIn <= 0) return;
    timerRef.current = window.setTimeout(
      () => setResendIn((value) => value - 1),
      1000,
    );
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [resendIn]);

  async function requestCode() {
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await signIn("password", { email, flow: "reset" });
      setStep("verify");
      setNotice(`We sent a six-digit code to ${email}.`);
      setResendIn(30);
    } catch (submitError) {
      setError(friendlyError(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await requestCode();
  }

  async function handleVerify() {
    setError(null);
    if (otp.length !== 6) {
      setError("Enter the six-digit code from your email.");
      return;
    }
    const invalid = passwordProblem(newPassword);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (newPassword !== confirm) {
      setError("Those passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await signIn("password", {
        email,
        code: otp,
        newPassword,
        flow: "reset-verification",
      });
      if (!result.signingIn) {
        setError(
          "The code could not be verified. Send a new one and try again.",
        );
        return;
      }
      toast.success("Password updated. Other devices were signed out.");
      onOpenChange(false);
    } catch (submitError) {
      setError(friendlyError(submitError));
      setOtp("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetDraft();
        onOpenChange(next);
      }}
    >
      <DialogContent className="rounded-[0.9rem] border-border/80 p-0 sm:max-w-md">
        <div className="border-b border-border/70 px-6 pb-5 pr-12 pt-6">
          <span className="flex size-10 items-center justify-center rounded-md border border-gold/25 bg-accent text-gold-ink">
            <KeyRound className="size-4" />
          </span>
          <DialogHeader className="mt-4 space-y-1.5">
            <DialogTitle className="font-editorial text-2xl">
              {step === "request"
                ? "Change your password"
                : "Choose a new password"}
            </DialogTitle>
            <DialogDescription className="text-[12.5px] leading-relaxed">
              {step === "request"
                ? `We will verify ${email} before allowing a password change.`
                : "Enter the verification code and your new password. Other active sessions will be signed out."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6">
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-unqualified/25 bg-unqualified-soft px-3.5 py-2.5 text-[12px] leading-relaxed text-unqualified"
            >
              {error}
            </div>
          )}
          {notice && (
            <div
              role="status"
              className="mb-4 rounded-md border border-qualified/25 bg-qualified-soft px-3.5 py-2.5 text-[12px] leading-relaxed text-qualified"
            >
              {notice}
            </div>
          )}

          {step === "request" ? (
            <form onSubmit={handleRequest} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="change-password-email"
                  className="text-[12px] font-semibold"
                >
                  Verified email
                </Label>
                <Input
                  id="change-password-email"
                  value={email}
                  readOnly
                  className="h-11 rounded-md bg-muted/50"
                />
              </div>
              <Button
                type="submit"
                className="h-11 w-full rounded-md text-[12.5px] font-semibold"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Sending code…
                  </>
                ) : (
                  "Send verification code"
                )}
              </Button>
              <p className="flex items-start gap-2 text-[10.5px] leading-relaxed text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-gold-ink" />
                A password code is required even while signed in, so someone
                with an open device cannot quietly change your credentials.
              </p>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <InputOTP
                  value={otp}
                  onChange={setOtp}
                  maxLength={6}
                  autoFocus
                  disabled={submitting}
                  aria-label="Six digit password reset code"
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="size-10 rounded-md border-border text-base"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="new-password"
                  className="text-[12px] font-semibold"
                >
                  New password
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="8+ characters, letter + number"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="h-11 rounded-md pr-10"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="confirm-password"
                  className="text-[12px] font-semibold"
                >
                  Confirm new password
                </Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repeat your new password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="h-11 rounded-md"
                  disabled={submitting}
                />
              </div>

              <Button
                type="button"
                className="h-11 w-full rounded-md text-[12.5px] font-semibold"
                disabled={submitting || otp.length !== 6}
                onClick={() => void handleVerify()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save new password"
                )}
              </Button>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <button
                  type="button"
                  onClick={() => void requestCode()}
                  disabled={resendIn > 0 || submitting}
                  className="font-semibold text-gold-ink underline-offset-4 hover:underline disabled:opacity-50"
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Send a new code"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("request")}
                  className="hover:text-foreground"
                >
                  Start over
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
