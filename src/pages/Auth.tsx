import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAction } from "convex/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AnimatedWordmark, BrandLockup } from "@/components/brand/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { DEMO_ACCOUNTS, type DemoRole } from "@/lib/demo";
import { passwordProblem } from "@/lib/password";
import { cn } from "@/lib/utils";

interface AuthProps {
  redirectAfterAuth?: string;
}

type Screen =
  | "signin"
  | "signup"
  | "reset"
  | "verify-signup"
  | "verify-signin"
  | "verify-reset";

function resolveRedirect(returnTo: string | null, fallback: string) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) return returnTo;
  return fallback;
}

function emailProblem(value: string): string | null {
  const email = value.trim();
  if (!email) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "That email address looks incomplete.";
  }
  return null;
}

function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (
    /invalid credentials|invalidsecret|invalid secret|incorrect password|invalid password/i.test(
      message,
    )
  ) {
    return "Email or password is incorrect.";
  }
  if (/already exists/i.test(message)) {
    return "An account already uses this email. Sign in instead, or reset your password.";
  }
  if (/no account|not found|reading '_id'|reading "_id"/i.test(message)) {
    return "No password account was found for that email. Use Create account with the same verified email to add one.";
  }
  if (/rate|too many|limit/i.test(message)) {
    return "Too many attempts. Wait a minute, then try again.";
  }
  if (
    /enter your|looks incomplete|at least 8|letter and one number|do not match/i.test(
      message,
    )
  ) {
    return message;
  }
  if (/code|expired/i.test(message)) {
    return "That verification code is incorrect or has expired. Request a new one.";
  }
  if (/could not send|integration_key|http/i.test(message)) {
    return "We could not send the verification email. Try again in a moment.";
  }
  if (/network|fetch|connection/i.test(message)) {
    return "We could not reach the server. Check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}

function passwordStrength(value: string) {
  const checks = [
    value.length >= 8,
    /[a-zA-Z]/.test(value),
    /[0-9]/.test(value),
    /[^a-zA-Z0-9]/.test(value),
  ];
  const count = checks.filter(Boolean).length;
  return {
    count,
    label:
      count <= 1
        ? "Weak"
        : count === 2
          ? "Fair"
          : count === 3
            ? "Strong"
            : "Excellent",
  };
}

function PasswordMeter({ password }: { password: string }) {
  const { count, label } = passwordStrength(password);
  return (
    <div className="flex items-center gap-3 pt-1">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              index < count ? "bg-gold" : "bg-border",
            )}
          />
        ))}
      </div>
      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        {password ? label : "8+ chars"}
      </span>
    </div>
  );
}

export default function Auth({ redirectAfterAuth = "/app" }: AuthProps) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const prepareDemo = useAction(api.demo.setup);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirect(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const demoRequest = searchParams.get("demo");

  const [screen, setScreen] = useState<Screen>(() =>
    searchParams.get("mode") === "signup" ? "signup" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [pendingPassword, setPendingPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [demoRole, setDemoRole] = useState<DemoRole | null>(null);
  const timerRef = useRef<number | null>(null);
  const demoInProgress = useRef(false);
  const autoDemoStarted = useRef(false);

  const isSignInFamily =
    screen === "signin" || screen === "reset" || screen === "verify-signin";
  const isSignUpFamily = screen === "signup" || screen === "verify-signup";
  const isVerify = screen.startsWith("verify");

  useEffect(() => {
    if (!authLoading && isAuthenticated && !demoInProgress.current) {
      navigate(redirect, { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

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

  function clearFeedback() {
    setError(null);
    setNotice(null);
  }

  function resetVerificationFields() {
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowNewPassword(false);
  }

  function switchScreen(next: Screen) {
    if (next === screen) return;
    clearFeedback();
    resetVerificationFields();
    setPassword("");
    setConfirm("");
    setPendingPassword("");
    setResendIn(0);
    setScreen(next);
  }

  async function handleDemo(role: DemoRole) {
    if (demoInProgress.current || demoRole !== null) return;
    demoInProgress.current = true;
    setDemoRole(role);
    clearFeedback();
    try {
      await prepareDemo();
      await signIn("password", {
        email: DEMO_ACCOUNTS[role].email,
        password: DEMO_ACCOUNTS[role].password,
        flow: "signIn",
      });
      navigate("/app", { replace: true });
    } catch (demoError) {
      console.warn("[Trabalink] Could not open the demo workspace", demoError);
      demoInProgress.current = false;
      setError("The demo workspace could not be opened. Please try again.");
    } finally {
      setDemoRole(null);
    }
  }

  useEffect(() => {
    if (authLoading || isAuthenticated || autoDemoStarted.current) return;
    if (demoRequest !== "applicant" && demoRequest !== "employer") return;
    autoDemoStarted.current = true;
    // Deferred one microtask so the effect itself never updates state during mount.
    queueMicrotask(() => void handleDemo(demoRequest));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, demoRequest]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();
    setIsSubmitting(true);
    try {
      if (screen === "signin") {
        const invalidEmail = emailProblem(email);
        if (invalidEmail) throw new Error(invalidEmail);
        if (!password) throw new Error("Enter your password.");
        const result = await signIn("password", {
          email: email.trim().toLowerCase(),
          password,
          flow: "signIn",
        });
        if (result.signingIn) {
          navigate(redirect, { replace: true });
          return;
        }
        setPendingPassword(password);
        setScreen("verify-signin");
        setNotice(
          `Confirm your email to finish signing in. We sent a code to ${email.trim()}.`,
        );
        setResendIn(30);
        return;
      }

      if (screen === "signup") {
        const invalidEmail = emailProblem(email);
        if (invalidEmail) throw new Error(invalidEmail);
        const invalidPassword = passwordProblem(password);
        if (invalidPassword) throw new Error(invalidPassword);
        if (password !== confirm)
          throw new Error("Those passwords do not match.");
        const result = await signIn("password", {
          email: email.trim().toLowerCase(),
          password,
          flow: "signUp",
        });
        if (result.signingIn) {
          navigate(redirect, { replace: true });
          return;
        }
        setPendingPassword(password);
        setScreen("verify-signup");
        setNotice(
          `We sent a six-digit code to ${email.trim()}. It expires in 15 minutes.`,
        );
        setResendIn(30);
        return;
      }

      if (screen === "reset") {
        const invalidEmail = emailProblem(email);
        if (invalidEmail) throw new Error(invalidEmail);
        await signIn("password", {
          email: email.trim().toLowerCase(),
          flow: "reset",
        });
        setScreen("verify-reset");
        setNotice(
          `We sent a six-digit code to ${email.trim()}. Enter it below with a new password.`,
        );
        setResendIn(30);
      }
    } catch (submitError) {
      setError(friendlyError(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify() {
    clearFeedback();
    if (otp.length !== 6) {
      setError("Enter the six-digit code from your email.");
      return;
    }
    if (screen === "verify-reset") {
      const invalidPassword = passwordProblem(newPassword);
      if (invalidPassword) {
        setError(invalidPassword);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Those passwords do not match.");
        return;
      }
    }
    setIsSubmitting(true);
    try {
      const result =
        screen === "verify-reset"
          ? await signIn("password", {
              email: email.trim().toLowerCase(),
              code: otp,
              newPassword,
              flow: "reset-verification",
            })
          : await signIn("password", {
              email: email.trim().toLowerCase(),
              code: otp,
              flow: "email-verification",
            });
      if (result.signingIn) {
        navigate(redirect, { replace: true });
      } else {
        setError(
          "We could not confirm that code. Request a new one and try again.",
        );
        setOtp("");
      }
    } catch (submitError) {
      setError(friendlyError(submitError));
      setOtp("");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendIn > 0 || isSubmitting) return;
    clearFeedback();
    setIsSubmitting(true);
    try {
      if (screen === "verify-reset") {
        await signIn("password", {
          email: email.trim().toLowerCase(),
          flow: "reset",
        });
      } else if (screen === "verify-signup") {
        if (!pendingPassword) {
          setError("Go back and enter your password again.");
          return;
        }
        await signIn("password", {
          email: email.trim().toLowerCase(),
          password: pendingPassword,
          flow: "signUp",
        });
      } else {
        if (!pendingPassword) {
          setError("Go back and sign in again.");
          return;
        }
        await signIn("password", {
          email: email.trim().toLowerCase(),
          password: pendingPassword,
          flow: "signIn",
        });
      }
      setNotice(`A fresh code is on its way to ${email.trim()}.`);
      setResendIn(30);
    } catch (submitError) {
      setError(friendlyError(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  const title =
    screen === "signin"
      ? "Welcome back."
      : screen === "signup"
        ? "Create your account."
        : screen === "reset"
          ? "Reset your password."
          : screen === "verify-reset"
            ? "Choose a new password."
            : "Confirm your email.";

  const subtitle =
    screen === "signin"
      ? "Use the password you chose when you created this account."
      : screen === "signup"
        ? "Set a password, then confirm your email with a six-digit code. Existing email-code accounts can use the same flow to add a password."
        : screen === "reset"
          ? "We will email you a verification code, then let you choose a new password."
          : screen === "verify-reset"
            ? `Enter the code sent to ${email} and choose a new password.`
            : `Enter the six-digit code sent to ${email}. Verification is only required for new accounts and password changes.`;

  return (
    <div className="relative min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <BrandLockup size="sm" animate />
        <div className="flex items-center gap-2">
          <span className="mr-2 hidden items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground md:inline-flex">
            <span className="size-1.5 rounded-full bg-gold" />
            Secure access · RA 10173
          </span>
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="h-9 rounded-md">
            <Link to="/">
              <ArrowLeft className="size-4" /> Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-10 px-5 pb-14 sm:px-8 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] lg:gap-12">
        <section className="flex flex-col justify-center py-2 lg:py-6">
          <div className="max-w-lg">
            <p className="flex items-center gap-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-ink">
              <span className="h-px w-6 bg-gold/70" />
              Account access / secure edition
            </p>
            <h1 className="mt-3 font-editorial text-[2.7rem] leading-[0.94] sm:text-[3.4rem]">
              A hiring desk with
              <br />
              <span className="italic text-gold-ink">nothing to hide.</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
              One account connects your evidence to the roles that value it.
              Password sign-in is standard; email verification appears only when
              the address is new or the password is being changed.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative mt-8 max-w-lg overflow-hidden rounded-[0.9rem] border border-border/80 bg-card/95 card-shadow"
          >
            <span
              className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent"
              aria-hidden="true"
            />

            {!isVerify && (
              <div className="flex border-b border-border/80 px-6 pt-5 sm:px-8">
                <button
                  type="button"
                  onClick={() => switchScreen("signin")}
                  className={cn(
                    "relative pb-4 pr-6 text-[13px] font-semibold transition-colors",
                    isSignInFamily
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Sign in
                  {isSignInFamily && (
                    <motion.span
                      layoutId="auth-tab"
                      className="absolute inset-x-0 -bottom-px h-0.5 bg-gold"
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => switchScreen("signup")}
                  className={cn(
                    "relative pb-4 pr-6 text-[13px] font-semibold transition-colors",
                    isSignUpFamily
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Create account
                  {isSignUpFamily && (
                    <motion.span
                      layoutId="auth-tab"
                      className="absolute inset-x-0 -bottom-px h-0.5 bg-gold"
                    />
                  )}
                </button>
              </div>
            )}

            <div className="p-6 sm:p-8">
              <div className="mb-6">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                  {screen === "signin"
                    ? "01 / Sign in"
                    : screen === "signup"
                      ? "02 / New account"
                      : screen === "reset"
                        ? "03 / Recovery"
                        : screen === "verify-reset"
                          ? "03 / New password"
                          : "02 / Email verification"}
                </p>
                <h2 className="mt-2 font-editorial text-[2rem] leading-none">
                  {title}
                </h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {subtitle}
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-md border border-unqualified/25 bg-unqualified-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-unqualified"
                >
                  {error}
                </div>
              )}
              {notice && (
                <div
                  role="status"
                  className="mb-4 rounded-md border border-qualified/25 bg-qualified-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-qualified"
                >
                  {notice}
                </div>
              )}

              {!isVerify ? (
                <form onSubmit={onSubmit} className="space-y-4" noValidate>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="email"
                      className="text-[12px] font-semibold"
                    >
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="h-11 rounded-md bg-background/60 pl-9"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {screen !== "reset" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <Label
                          htmlFor="password"
                          className="text-[12px] font-semibold"
                        >
                          Password
                        </Label>
                        {screen === "signin" && (
                          <button
                            type="button"
                            onClick={() => {
                              clearFeedback();
                              resetVerificationFields();
                              setScreen("reset");
                            }}
                            className="text-[11px] font-semibold text-gold-ink underline-offset-4 hover:underline"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete={
                            screen === "signup"
                              ? "new-password"
                              : "current-password"
                          }
                          placeholder={
                            screen === "signup"
                              ? "8+ characters, letter + number"
                              : "Your password"
                          }
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          className="h-11 rounded-md bg-background/60 pl-9 pr-10"
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                      {screen === "signup" && (
                        <PasswordMeter password={password} />
                      )}
                    </div>
                  )}

                  {screen === "signup" && (
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="confirm"
                        className="text-[12px] font-semibold"
                      >
                        Confirm password
                      </Label>
                      <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="confirm"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Repeat your password"
                          value={confirm}
                          onChange={(event) => setConfirm(event.target.value)}
                          className="h-11 rounded-md bg-background/60 pl-9"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="h-12 w-full rounded-md text-[13px] font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {screen === "reset"
                          ? "Sending code…"
                          : screen === "signup"
                            ? "Creating account…"
                            : "Signing in…"}
                      </>
                    ) : (
                      <>
                        {screen === "reset"
                          ? "Send verification code"
                          : screen === "signup"
                            ? "Create account"
                            : "Sign in"}
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>

                  {screen === "reset" ? (
                    <div className="space-y-1 text-center text-[11px] leading-relaxed text-muted-foreground">
                      <p>
                        Remembered it?{" "}
                        <button
                          type="button"
                          onClick={() => switchScreen("signin")}
                          className="font-semibold text-gold-ink underline-offset-4 hover:underline"
                        >
                          Back to sign in
                        </button>
                      </p>
                      <p>
                        Previously used email codes?{" "}
                        <button
                          type="button"
                          onClick={() => switchScreen("signup")}
                          className="font-semibold text-gold-ink underline-offset-4 hover:underline"
                        >
                          Add a password
                        </button>
                      </p>
                    </div>
                  ) : (
                    <p className="flex items-start gap-2 border-t border-border/70 pt-3 text-[10.5px] leading-relaxed text-muted-foreground">
                      <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-gold-ink" />
                      {screen === "signup"
                        ? "We only email a code to confirm a new account. After that, sign in with your password."
                        : "Your password is stored as a one-way hash. Email verification is only used for account creation and password changes."}
                    </p>
                  )}
                </form>
              ) : (
                <div className="space-y-5">
                  <div className="flex justify-center">
                    <InputOTP
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      disabled={isSubmitting}
                      autoFocus
                      aria-label="Six digit verification code"
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot
                            key={index}
                            index={index}
                            className="size-9 rounded-md border-border text-base sm:size-11"
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  {screen === "verify-reset" && (
                    <>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="new-password"
                          className="text-[12px] font-semibold"
                        >
                          New password
                        </Label>
                        <div className="relative">
                          <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="new-password"
                            type={showNewPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="8+ characters, letter + number"
                            value={newPassword}
                            onChange={(event) =>
                              setNewPassword(event.target.value)
                            }
                            className="h-11 rounded-md bg-background/60 pl-9 pr-10"
                            disabled={isSubmitting}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowNewPassword((value) => !value)
                            }
                            className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label={
                              showNewPassword
                                ? "Hide new password"
                                : "Show new password"
                            }
                          >
                            {showNewPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                        <PasswordMeter password={newPassword} />
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
                          type={showNewPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Repeat your new password"
                          value={confirmPassword}
                          onChange={(event) =>
                            setConfirmPassword(event.target.value)
                          }
                          className="h-11 rounded-md bg-background/60"
                          disabled={isSubmitting}
                        />
                      </div>
                    </>
                  )}

                  <Button
                    type="button"
                    size="lg"
                    className="h-12 w-full rounded-md text-[13px] font-semibold"
                    disabled={isSubmitting || otp.length !== 6}
                    onClick={() => void handleVerify()}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Verifying…
                      </>
                    ) : (
                      <>
                        {screen === "verify-reset"
                          ? "Save new password"
                          : "Verify and continue"}
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>

                  <div className="flex flex-col items-center gap-2 text-center text-[11px] text-muted-foreground">
                    <p>
                      Didn&apos;t receive it?{" "}
                      <button
                        type="button"
                        onClick={() => void handleResend()}
                        disabled={resendIn > 0 || isSubmitting}
                        className="font-semibold text-gold-ink underline-offset-4 hover:underline disabled:opacity-50"
                      >
                        {resendIn > 0
                          ? `Resend in ${resendIn}s`
                          : "Send a new code"}
                      </button>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (screen === "verify-reset") switchScreen("reset");
                        else if (screen === "verify-signup")
                          switchScreen("signup");
                        else switchScreen("signin");
                      }}
                      className="font-medium underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Use a different email
                    </button>
                  </div>
                </div>
              )}

              {screen === "signin" && (
                <div className="mt-6 border-t border-border/70 pt-5">
                  <div className="flex items-center gap-2.5">
                    <span className="h-px flex-1 bg-border" />
                    <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Or open a demo
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-md bg-card text-[12px]"
                      disabled={demoRole !== null || isSubmitting}
                      onClick={() => void handleDemo("applicant")}
                    >
                      {demoRole === "applicant" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <UserRound className="size-4" />
                      )}
                      Applicant demo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-md bg-card text-[12px]"
                      disabled={demoRole !== null || isSubmitting}
                      onClick={() => void handleDemo("employer")}
                    >
                      {demoRole === "employer" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Building2 className="size-4" />
                      )}
                      Employer demo
                    </Button>
                  </div>
                  <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
                    One click, no email. Shared sample data; create an account
                    for a clean workspace.
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          <p className="mt-4 max-w-lg text-[10.5px] leading-relaxed text-muted-foreground">
            By continuing, you acknowledge the{" "}
            <Link
              to="/#privacy"
              className="underline underline-offset-4 hover:text-foreground"
            >
              RA 10173 privacy notice
            </Link>{" "}
            and TRABALINK&apos;s fair-hiring policy. Accounts created before the
            password rollout can add one by using Create account with the same
            verified email.
          </p>
        </section>

        <aside className="relative hidden min-h-[640px] overflow-hidden rounded-[1rem] border border-white/10 bg-[#0d2942] p-10 text-[#f3f8fc] lg:flex lg:flex-col lg:justify-between">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.22]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -right-24 -top-24 size-[30rem] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(199,154,34,0.24) 0%, transparent 68%)",
            }}
            aria-hidden="true"
          />

          <div className="relative">
            <div className="flex items-center justify-between">
              <AnimatedWordmark className="text-xl" delay={0.1} tone="onNavy" />
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">
                Field note / 001
              </span>
            </div>
            <p className="mt-20 max-w-md font-mono text-[10px] uppercase tracking-[0.18em] text-[#e7c05a]">
              The evidence ledger
            </p>
            <h2 className="mt-4 max-w-lg font-editorial text-[3.2rem] leading-[0.94]">
              Evidence,
              <br />
              <span className="italic text-[#e7c05a]">not adjectives.</span>
            </h2>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/65">
              Every requirement is named, weighted, and explained. Applicants
              and hiring teams read the same breakdown, and a person still makes
              the final call.
            </p>
          </div>

          <div className="relative mt-12 border-t border-white/15 pt-6">
            <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">
              <span>Match ledger</span>
              <span>86 / 100</span>
            </div>
            <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
              {[
                ["React + TypeScript", "Matched", "text-emerald-300"],
                ["BS Information Technology", "Matched", "text-emerald-300"],
                ["Professional license", "Condition", "text-[#e7c05a]"],
                ["Two years of experience", "Not required", "text-white/40"],
              ].map(([label, status, tone]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <span className="text-[12px] text-white/80">{label}</span>
                  <span
                    className={cn(
                      "font-mono text-[9px] uppercase tracking-[0.12em]",
                      tone,
                    )}
                  >
                    {status}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-start gap-2.5 text-[10.5px] leading-relaxed text-white/45">
              <Check className="mt-0.5 size-3.5 shrink-0 text-[#e7c05a]" />
              No automatic rejections. Conditions carry deadlines, not verdicts.
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
