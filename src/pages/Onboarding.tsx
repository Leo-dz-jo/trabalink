import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Loader2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { BrandLockup, AnimatedWordmark } from "@/components/brand/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScreenLoader } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useViewer } from "@/hooks/use-viewer";
import { sendWelcomeEmail } from "@/lib/email";
import { cn } from "@/lib/utils";

const schema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Enter your name so people know who they are talking to")
    .max(120, "That name is too long"),
  consent: z.boolean().refine((value) => value, {
    message: "Please accept the privacy notice to continue",
  }),
});

type Values = z.infer<typeof schema>;

export default function Onboarding() {
  const { viewer, isLoading } = useViewer();
  const { user } = useAuth();
  const assignRole = useMutation(api.profiles.setRole);
  const navigate = useNavigate();
  const [role, setRole] = useState<"applicant" | "employer">("applicant");
  const [submitting, setSubmitting] = useState(false);

  const existingRole =
    viewer?.user.role === "employer" || viewer?.user.role === "applicant"
      ? viewer.user.role
      : null;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: "", consent: false },
  });

  useEffect(() => {
    if (existingRole) setRole(existingRole);
    if (isLoading || !viewer) return;
    if (viewer.applicant || viewer.employer)
      navigate("/app", { replace: true });
    const suggestedName =
      existingRole === "employer"
        ? viewer.employer?.companyName
        : viewer.applicant?.fullName;
    form.reset({
      displayName: suggestedName ?? viewer.user.name ?? "",
      consent: Boolean(viewer.user.consentAt),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, viewer, existingRole, navigate]);

  if (isLoading) return <ScreenLoader label="Preparing your workspace" />;

  async function onSubmit(values: Values) {
    setSubmitting(true);
    try {
      await assignRole({
        role,
        fullName: values.displayName.trim(),
        consent: true,
      });
      void sendWelcomeEmail({
        toName: values.displayName.trim(),
        toEmail: user?.email ?? undefined,
        role,
      });
      toast.success(
        role === "applicant"
          ? "Welcome aboard — let's build your applicant profile."
          : "Workspace created — add your company details next.",
      );
      navigate("/app/profile?onboarding=1", { replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "We could not save your role. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 shell-grid opacity-60"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-0 size-[34rem] -translate-x-1/2 rounded-full accent-glow"
        aria-hidden="true"
      />

      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <BrandLockup to="/" size="sm" animate />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {existingRole && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-10 rounded-lg"
            >
              <Link to="/app">
                <ArrowLeft className="size-4" /> Workspace
              </Link>
            </Button>
          )}
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-4 pb-20 pt-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="border-b border-border/80 pb-6">
            <p className="flex items-center gap-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-ink">
              <span className="h-px w-6 bg-gold/70" />
              {existingRole ? "Finish your setup" : "One quick setup"}
            </p>
            <h1 className="mt-3 font-editorial text-[2.7rem] leading-[0.98] text-balance sm:text-[3.4rem]">
              Welcome to{" "}
              <AnimatedWordmark className="inline text-[0.92em]" delay={0.2} />
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
              Choose the side of the hiring table you are on. You can keep one
              account — the workspace is built around your role.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  value: "applicant" as const,
                  icon: UserRound,
                  title: "I'm applying",
                  body: "Build a profile, upload your resume, and see why you match each role.",
                  note: "Fresh grads and students welcome",
                },
                {
                  value: "employer" as const,
                  icon: Building2,
                  title: "I'm hiring",
                  body: "Post roles with weighted requirements and review ranked applicants.",
                  note: "For HR and hiring managers",
                },
              ] as const
            ).map((option) => {
              const active = role === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRole(option.value)}
                  aria-pressed={active}
                  className={cn(
                    "relative flex min-h-[168px] flex-col items-start rounded-lg border p-5 text-left transition-all",
                    active
                      ? "border-gold/50 bg-card card-shadow-lg"
                      : "border-border/70 bg-card/60 hover:border-gold/30 hover:bg-card",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="role-check"
                      className="absolute right-4 top-4 flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground"
                    >
                      <Check className="size-3.5" strokeWidth={3} />
                    </motion.span>
                  )}
                  <span
                    className={cn(
                      "flex size-11 items-center justify-center rounded-md border transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-accent-foreground",
                    )}
                  >
                    <option.icon className="size-5" />
                  </span>
                  <h2 className="mt-4 font-editorial text-xl">
                    {option.title}
                  </h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    {option.body}
                  </p>
                  <span className="mt-3 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-gold-ink">
                    {option.note}
                  </span>
                </button>
              );
            })}
          </div>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-5 rounded-lg border border-border/80 bg-card p-5 card-shadow sm:p-7"
            noValidate
          >
            <div className="space-y-1.5">
              <Label
                htmlFor="displayName"
                className="text-[13px] font-semibold"
              >
                {role === "applicant" ? "Your full name" : "Company name"}
              </Label>
              <Input
                id="displayName"
                autoComplete={role === "applicant" ? "name" : "organization"}
                placeholder={
                  role === "applicant"
                    ? "e.g. Maria Santos"
                    : "e.g. Kalinaw Digital"
                }
                className={cn(
                  "h-12 rounded-md",
                  form.formState.errors.displayName && "border-unqualified",
                )}
                aria-invalid={Boolean(form.formState.errors.displayName)}
                disabled={submitting}
                {...form.register("displayName")}
              />
              {form.formState.errors.displayName && (
                <p className="text-xs text-unqualified">
                  {form.formState.errors.displayName.message}
                </p>
              )}
            </div>

            <div className="mt-5 rounded-md border border-border/70 bg-muted/40 p-4">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-bold">
                    Philippine Data Privacy Act consent (RA 10173)
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    Trabalink stores the profile, resume, and application data
                    you provide so hiring teams you apply to can review your
                    fit. Your resume and photo are private, shared only with
                    employers who receive your application. You may withdraw
                    consent by requesting data removal from the platform
                    administrator. We never sell your information or use it for
                    third-party profiling.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-start gap-2.5">
                <Checkbox
                  id="consent"
                  checked={form.watch("consent")}
                  onCheckedChange={(value) =>
                    form.setValue("consent", value === true, {
                      shouldValidate: true,
                    })
                  }
                  disabled={submitting}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="consent"
                  className="text-[12px] font-medium leading-snug"
                >
                  I have read the privacy notice and consent to my data being
                  processed for job matching and application review.
                </Label>
              </div>
              {form.formState.errors.consent && (
                <p className="mt-2 text-xs text-unqualified">
                  {form.formState.errors.consent.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="mt-5 h-12 w-full rounded-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Setting up…
                </>
              ) : (
                <>
                  Continue as {role === "applicant" ? "applicant" : "employer"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              You can sign out at any time. Your email is already verified.
            </p>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
