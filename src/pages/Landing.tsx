import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  CircleDashed,
  FileCheck2,
  GraduationCap,
  Layers,
  MessageSquare,
  ShieldCheck,
  Bot,
  Sparkles,
  Timer,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { AnimatedWordmark, BrandLockup } from "@/components/brand/brand";
import { LandingBackdrop } from "@/components/landing-backdrop";
import { BucketBadge, Chip, ScoreRing } from "@/components/shared/badges";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? undefined : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={fadeUp}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const requirementRows = [
  {
    status: "matched" as const,
    label: "React + TypeScript",
    detail: "Found on your profile",
  },
  {
    status: "matched" as const,
    label: "BS Information Technology",
    detail: "University of the Philippines · 2025",
  },
  {
    status: "partial" as const,
    label: "PRC license (obtainable later)",
    detail: "Exam scheduled · Apr 15, 2026",
  },
  {
    status: "missing" as const,
    label: "2 years of experience",
    detail: "Fresh-grad mode: weight reduced to 6%",
  },
];

const applicantSteps = [
  {
    icon: FileCheck2,
    title: "Build a profile that proves it",
    body: "Resume, projects, skills, OJT, and credentials in one place. The completeness bar tells you exactly what is missing.",
  },
  {
    icon: Sparkles,
    title: "See why you match",
    body: "Every job shows a live score with matched, partial, and missing requirements — before you spend time applying.",
  },
  {
    icon: ShieldCheck,
    title: "Get a human decision",
    body: "No silent auto-rejections. Hiring teams review the same transparent breakdown and record their decision.",
  },
];

const employerSteps = [
  {
    icon: Layers,
    title: "Turn the role into requirements",
    body: "Mark each requirement mandatory, obtainable later, or preferred, with weights and OR alternatives.",
  },
  {
    icon: Users,
    title: "Review a ranked pipeline",
    body: "Applicants arrive sorted by qualification score with a breakdown you can audit, not a black-box ranking.",
  },
  {
    icon: Timer,
    title: "Track conditions, not guesswork",
    body: "Pending licenses and exam dates become dated reminders, so conditional hires never fall through.",
  },
];

const features = [
  {
    icon: Sparkles,
    title: "Explainable scoring",
    body: "A deterministic engine turns requirements and profile evidence into a 0–100 score with plain-language reasons.",
  },
  {
    icon: GraduationCap,
    title: "Fresh-grad mode",
    body: "Entry-level roles automatically reduce experience weight and elevate education, honors, OJT, and credentials.",
  },
  {
    icon: CircleDashed,
    title: "Conditions with deadlines",
    body: "Licenses marked exam-scheduled earn partial credit and a follow-up date instead of an instant rejection.",
  },
  {
    icon: FileCheck2,
    title: "Resume and profile in one",
    body: "PDF and DOCX resumes up to 5 MB, validated on upload and viewable by the hiring team when it matters.",
  },
  {
    icon: Layers,
    title: "OR alternatives",
    body: "Group requirements so a license or a degree plus a scheduled exam can both satisfy the same condition.",
  },
  {
    icon: MessageSquare,
    title: "Private messaging",
    body: "Applicants and employers can discuss the role inside a private thread tied to the job — with unread tracking.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy by default",
    body: "RA 10173 consent, private storage, and role-scoped access. Administrators moderate the platform without reading private threads.",
  },
  {
    icon: Users,
    title: "Accountable moderation",
    body: "A dedicated administrator console suspends policy violations and removes unsafe posts, while preserving appeal records.",
  },
  {
    icon: Bot,
    title: "Workspace copilot",
    body: "Ask for your strongest matches, profile gaps, pipeline summary, or unread follow-ups. Every answer is grounded in live workspace data.",
  },
];

export default function Landing() {
  const [audience, setAudience] = useState<"applicant" | "employer">(
    "applicant",
  );
  const steps = audience === "applicant" ? applicantSteps : employerSteps;
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative isolate min-h-screen text-foreground">
      <LandingBackdrop />
      <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[calc(100%+1.5rem)] bg-gradient-to-b from-background via-background/85 to-transparent"
          aria-hidden="true"
        />
        <div className="relative mx-auto flex h-14 max-w-7xl items-center gap-3 rounded-[1rem] border border-border/80 bg-card/90 p-2 pl-3 shadow-[0_1px_2px_rgba(11,34,57,0.05),0_18px_52px_-30px_rgba(11,34,57,0.5)] backdrop-blur-2xl sm:h-[60px] sm:pl-4">
          <span
            className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent"
            aria-hidden="true"
          />
          <BrandLockup size="sm" animate />
          <nav className="ml-2 hidden items-center gap-0.5 rounded-lg border border-border/50 bg-muted/60 p-1 text-[12px] font-semibold tracking-tight text-muted-foreground md:flex">
            <a
              href="#how"
              className="rounded-md px-3 py-2 transition-colors hover:bg-background/80 hover:text-foreground"
            >
              How it works
            </a>
            <a
              href="#engine"
              className="rounded-md px-3 py-2 transition-colors hover:bg-background/80 hover:text-foreground"
            >
              Screening engine
            </a>
            <a
              href="#employers"
              className="rounded-md px-3 py-2 transition-colors hover:bg-background/80 hover:text-foreground"
            >
              For employers
            </a>
            <a
              href="#privacy"
              className="rounded-md px-3 py-2 transition-colors hover:bg-background/80 hover:text-foreground"
            >
              Privacy
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle className="size-9 border-border/60 bg-card/60" />
            <Button
              asChild
              variant="ghost"
              className="hidden h-9 rounded-full px-3.5 text-[13px] sm:inline-flex"
            >
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button
              asChild
              className="h-9 rounded-full px-4 text-[12px] font-semibold shadow-[0_8px_20px_-12px_rgba(21,58,91,0.8)]"
            >
              <Link to="/auth?mode=signup">
                Get started <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-40 -top-32 size-[36rem] rounded-full accent-glow"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="grid items-center gap-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10">
            <div>
              <motion.div
                initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-3 border-l-2 border-gold pl-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
              >
                <span className="text-gold-ink">01 /</span>
                Evidence-first hiring · Built for the Philippines
              </motion.div>

              <motion.h1
                initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.65,
                  delay: 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="mt-7 font-editorial text-[3.15rem] leading-[0.92] text-balance sm:text-[4.4rem] lg:text-[5.15rem]"
              >
                Hire on proof,
                <br />
                <span className="italic text-gold-ink">not luck.</span>
              </motion.h1>

              <motion.p
                initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.14 }}
                className="mt-6 max-w-xl text-[15px] leading-7 text-muted-foreground text-pretty sm:text-base"
              >
                <AnimatedWordmark
                  className="text-[1.05em] text-foreground"
                  delay={0.3}
                />{" "}
                automates the first pass of every application. Each requirement
                becomes a transparent qualification score, so fresh graduates
                are judged on evidence and hiring teams begin with a ranked,
                explainable shortlist.
              </motion.p>

              <motion.div
                initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.22 }}
                className="mt-8 flex flex-col gap-3 sm:flex-row"
              >
                                <Button asChild size="lg" className="h-12 rounded-md px-6 text-[14px] font-semibold card-shadow">
                  <Link to="/auth?mode=signup">
                    Find your next role <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-md border-border bg-card/70 px-6 text-[14px] font-semibold backdrop-blur"
                >
                  <Link to="/auth?mode=signup">
                    <Building2 className="size-4" /> Hire with clarity
                  </Link>
                </Button>
              </motion.div>

              <motion.div
                initial={reduceMotion ? undefined : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.32, duration: 0.5 }}
                className="mt-4"
              >
                <p className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  No account needed:{" "}
                  <Link
                    to="/auth?demo=applicant"
                    className="inline-flex items-center gap-1 font-semibold text-gold-ink underline-offset-4 hover:underline"
                  >
                    applicant demo <ArrowUpRight className="size-3" />
                  </Link>
                  <span className="text-border">/</span>
                  <Link
                    to="/auth?demo=employer"
                    className="inline-flex items-center gap-1 font-semibold text-gold-ink underline-offset-4 hover:underline"
                  >
                    employer demo <ArrowUpRight className="size-3" />
                  </Link>
                </p>
              </motion.div>

              <motion.ul
                initial={reduceMotion ? undefined : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-border/70 pt-4 font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground"
              >
                {[
                  "Free for applicants",
                  "No automatic rejections",
                  "Human-reviewed decisions",
                ].map((item) => (
                  <li key={item} className="inline-flex items-center gap-1.5">
                    <Check className="size-3 text-gold-ink" strokeWidth={3} />{" "}
                    {item}
                  </li>
                ))}
              </motion.ul>
            </div>

            {/* Product preview */}
            <motion.div
              initial={
                reduceMotion ? undefined : { opacity: 0, y: 30, rotate: -1.5 }
              }
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{
                duration: 0.9,
                delay: 0.2,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative mx-auto w-full max-w-[520px]"
            >
              <div className="pointer-events-none absolute -inset-4 rounded-[1.2rem] border border-gold/15 bg-primary/[0.03]" />
              <div className="relative overflow-hidden rounded-[0.9rem] border border-border/80 bg-card card-shadow-lg">
                <div className="flex items-center justify-between border-b border-border/70 bg-muted/45 px-5 py-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <span>Match brief / 042</span>
                  <span className="inline-flex items-center gap-1.5 text-gold-ink">
                    <span className="size-1.5 rounded-full bg-gold" /> Live
                  </span>
                </div>
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-1.5">
                        <Chip>Product preview</Chip>
                        <Chip tone="accent">
                          Entry level · Fresh-grad friendly
                        </Chip>
                      </div>
                      <h2 className="mt-3 font-editorial text-2xl leading-tight">
                        Junior Web Developer
                      </h2>
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        Kalinaw Digital · Metro Manila · Full-time
                      </p>
                    </div>
                    <ScoreRing
                      score={86}
                      bucket="CONDITIONALLY_QUALIFIED"
                      size={72}
                    />
                  </div>

                  <div className="mt-6 flex items-center justify-between border-y border-border/70 py-2.5">
                    <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Why you match
                    </span>
                    <BucketBadge
                      bucket="CONDITIONALLY_QUALIFIED"
                      label="1 condition"
                    />
                  </div>

                  <ul className="divide-y divide-border/60">
                    {requirementRows.map((row, index) => (
                      <motion.li
                        key={row.label}
                        initial={
                          reduceMotion ? undefined : { opacity: 0, x: -8 }
                        }
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="flex items-start gap-2.5 py-2.5"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm",
                            row.status === "matched" &&
                              "bg-qualified-soft text-qualified",
                            row.status === "partial" &&
                              "bg-conditional-soft text-conditional",
                            row.status === "missing" &&
                              "bg-unqualified-soft text-unqualified",
                          )}
                        >
                          {row.status === "matched" ? (
                            <Check className="size-3" strokeWidth={3} />
                          ) : row.status === "partial" ? (
                            <CircleDashed
                              className="size-3"
                              strokeWidth={2.5}
                            />
                          ) : (
                            <X className="size-3" strokeWidth={3} />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold leading-tight">
                            {row.label}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                            {row.detail}
                          </p>
                        </div>
                      </motion.li>
                    ))}
                  </ul>

                  <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-4">
                    <p className="text-[10px] text-muted-foreground">
                      Score is a recommendation. A human decides.
                    </p>
                    <span className="inline-flex items-center gap-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-gold-ink">
                      View breakdown <ArrowUpRight className="size-3" />
                    </span>
                  </div>
                </div>
              </div>

              <motion.div
                initial={
                  reduceMotion ? undefined : { opacity: 0, y: 14, scale: 0.96 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.9, duration: 0.6 }}
                className="absolute -left-4 -top-6 hidden rounded-md border border-border/80 border-l-2 border-l-gold bg-card/95 px-3.5 py-2.5 card-shadow backdrop-blur sm:flex sm:items-center sm:gap-2.5"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <GraduationCap className="size-4" />
                </span>
                <div>
                  <p className="text-[11px] font-bold leading-tight">
                    Fresh-grad mode
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Experience weight 40 → 6
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={
                  reduceMotion ? undefined : { opacity: 0, y: 14, scale: 0.96 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 1.05, duration: 0.6 }}
                className="absolute -bottom-6 -right-3 hidden rounded-md border border-border/80 border-l-2 border-l-conditional bg-card/95 px-3.5 py-2.5 card-shadow backdrop-blur sm:flex sm:items-center sm:gap-2.5"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-conditional-soft text-conditional">
                  <Timer className="size-4" />
                </span>
                <div>
                  <p className="text-[11px] font-bold leading-tight">
                    Condition tracked
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    License due in 90 days
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Value strip */}
      <section className="mx-auto max-w-7xl px-4 pb-6 pt-10 sm:px-6 lg:px-8">
        <div className="grid border-y border-border/80 sm:grid-cols-3">
          {[
            {
              value: "Requirement-level",
              label: "match breakdown on every application",
            },
            {
              value: "3 buckets",
              label: "qualified, conditional, not qualified",
            },
            { value: "Zero", label: "automatic rejections — humans decide" },
          ].map((item, index) => (
            <Reveal
              key={item.value}
              delay={index * 0.06}
              className="flex items-baseline gap-3 border-b border-border/70 py-5 last:border-b-0 sm:border-b-0 sm:border-l sm:border-border/70 sm:px-6 sm:first:border-l-0 sm:first:pl-0"
            >
              <span className="font-mono text-[9px] text-gold-ink">
                0{index + 1}
              </span>
              <div>
                <p className="font-editorial text-xl text-foreground">
                  {item.value}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  {item.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        id="how"
        className="mx-auto max-w-7xl scroll-mt-28 px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
      >
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <Reveal>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-ink">
                How Trabalink works
              </p>
              <h2 className="mt-3 font-editorial text-[2.6rem] leading-[1.02] text-balance sm:text-[3.3rem]">
                One shared language for{" "}
                <span className="font-serif font-normal italic text-gold-ink">
                  fit.
                </span>
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
                Applicants and employers see the same requirement-by-requirement
                breakdown. That is what makes the conversation about evidence
                instead of impressions.
              </p>
            </Reveal>

            <div className="mt-7 inline-flex rounded-md border border-border/80 bg-card p-1 card-shadow">
              {(["applicant", "employer"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAudience(option)}
                  className={cn(
                    "relative min-h-[40px] rounded-sm px-4 text-sm font-semibold capitalize transition-colors",
                    audience === option
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {audience === option && (
                    <motion.span
                      layoutId="audience-pill"
                      className="absolute inset-0 rounded-sm bg-primary"
                      transition={{
                        type: "spring",
                        stiffness: 340,
                        damping: 30,
                      }}
                    />
                  )}
                  <span className="relative z-10">
                    {option === "applicant" ? "I'm applying" : "I'm hiring"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <motion.ol
            key={audience}
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {steps.map((step, index) => (
              <motion.li
                key={step.title}
                variants={fadeUp}
                transition={{ duration: 0.45 }}
                className="group flex gap-4 border-t border-border/80 py-5 transition-colors hover:border-gold/50"
              >
                <div className="flex flex-col items-center">
                  <span className="flex size-10 items-center justify-center rounded-md border border-gold/25 bg-accent text-accent-foreground transition-colors group-hover:border-gold/50">
                    <step.icon className="size-5" />
                  </span>
                  <span className="mt-2 font-mono text-[10px] font-bold text-muted-foreground">
                    0{index + 1}
                  </span>
                </div>
                <div>
                  <h3 className="font-display text-base font-bold">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      {/* Engine */}
      <section
        id="engine"
        className="relative scroll-mt-28 overflow-hidden border-y border-border/60 bg-card/40"
      >
        <div
          className="pointer-events-none absolute -left-32 top-0 size-[28rem] rounded-full accent-glow"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <Reveal className="max-w-2xl">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-ink">
              The screening engine
            </p>
            <h2 className="mt-3 font-editorial text-[2.6rem] leading-[1.02] text-balance sm:text-[3.3rem]">
              Weighted requirements. Plain-language reasons.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Employers set what is mandatory, what can be obtained later, and
              what is merely preferred. Trabalink does the arithmetic and always
              shows its work.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                bucket: "QUALIFIED" as const,
                title: "Every mandatory met",
                body: "Preferred gaps only trim the score. The applicant moves forward for human review.",
                icon: BadgeCheck,
              },
              {
                bucket: "CONDITIONALLY_QUALIFIED" as const,
                title: "A dated condition",
                body: "An exam scheduled or a license obtainable within a grace period earns partial credit and a follow-up date.",
                icon: Timer,
              },
              {
                bucket: "NOT_QUALIFIED" as const,
                title: "A mandatory gap",
                body: "The reason is named. The employer can still override the bucket with a note — nothing is auto-rejected.",
                icon: X,
              },
            ].map((item, index) => (
              <Reveal key={item.bucket} delay={index * 0.07}>
                <div className="h-full border-t border-border/80 pt-5 transition-colors hover:border-gold/50">
                  <div className="flex items-center justify-between gap-3">
                    <BucketBadge bucket={item.bucket} />
                    <item.icon className="size-4 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 font-editorial text-xl">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-8">
            <div className="flex flex-col gap-3 rounded-md border border-gold/25 bg-accent/50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-gold/25 bg-card text-gold-ink card-shadow">
                  <GraduationCap className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-bold">
                    Fresh-grad and student mode
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    For entry-level roles, experience weight drops to near zero
                    while education, honors, OJT, certifications, and capstone
                    work carry the score.
                  </p>
                </div>
              </div>
              <Chip tone="accent" className="w-fit shrink-0">
                Experience × 0.15 · Education × 1.3
              </Chip>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
      >
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-ink">
            Built for the messy middle
          </p>
          <h2 className="mt-3 font-editorial text-[2.6rem] leading-[1.02] text-balance sm:text-[3.3rem]">
            The details hiring usually skips.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Licenses with exam dates, fresh graduates without work history, and
            requirements that can wait — all handled honestly.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 0.04}>
              <div className="group relative h-full border-t border-border/80 py-5 transition-colors hover:border-gold/50">
                <span className="flex size-9 items-center justify-center rounded-md border border-gold/25 bg-accent text-accent-foreground transition-colors group-hover:border-gold/50">
                  <feature.icon className="size-4" />
                </span>
                <h3 className="mt-3 font-display text-[14px] font-bold">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Employer section */}
      <section
        id="employers"
        className="scroll-mt-28 border-y border-border/60 bg-card/40"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28 [&>*]:min-w-0">
          <Reveal>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-ink">
              For hiring teams
            </p>
            <h2 className="mt-3 font-editorial text-[2.6rem] leading-[1.02] text-balance sm:text-[3.3rem]">
              A pipeline you can defend.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Filter by bucket, open the applicant, and read the exact
              requirements they meet. Resume, credentials, and exam dates sit
              next to the score, and every decision is yours to record.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Rank applicants by explainable score, not keyword density",
                "Filter qualified, conditional, and not-qualified buckets",
                "Private threads with applicants, attached to the role",
                "Notes and status history for every candidate",
                "Reminders for pending licenses and exam deadlines",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-qualified-soft text-qualified">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="mt-8 h-12 rounded-md px-6">
              <Link to="/auth">
                Build your first job post <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-[0.9rem] border border-border/80 bg-card p-5 card-shadow-lg sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Applicant pipeline
                  </p>
                  <h3 className="mt-1 font-editorial text-xl">
                    Junior Web Developer
                  </h3>
                </div>
                <BucketBadge bucket="QUALIFIED" label="12 ranked" />
              </div>

              <div className="mt-4 space-y-2.5">
                {[
                  {
                    name: "Mika Santos",
                    note: "Fresh grad · 4 of 5 met",
                    score: 86,
                    bucket: "CONDITIONALLY_QUALIFIED" as const,
                    status: "Exam scheduled",
                  },
                  {
                    name: "Joaquin Reyes",
                    note: "Licensed · 5 of 5 met",
                    score: 94,
                    bucket: "QUALIFIED" as const,
                    status: "Ready",
                  },
                  {
                    name: "Aira Delos Santos",
                    note: "2 years OJT · 4 of 5 met",
                    score: 71,
                    bucket: "QUALIFIED" as const,
                    status: "Ready",
                  },
                ].map((person) => (
                  <div
                    key={person.name}
                    className="flex items-center gap-3 rounded-md border border-border/70 bg-background/60 p-3 transition-colors hover:border-gold/40"
                  >
                    <span className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                      {person.name
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">
                        {person.name}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {person.note} · {person.status}
                      </p>
                    </div>
                    <BucketBadge
                      bucket={person.bucket}
                      compact
                      label={`${person.score}`}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-4">
                <p className="text-[11px] text-muted-foreground">
                  Sorted by score, then by application date.
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                  Open pipeline <ArrowUpRight className="size-3" />
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Privacy */}
      <section
        id="privacy"
        className="mx-auto max-w-7xl scroll-mt-28 px-4 py-16 sm:px-6 lg:px-8"
      >
        <Reveal className="grid gap-6 rounded-[0.9rem] border border-border/80 border-l-2 border-l-gold bg-card p-6 card-shadow sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-ink">
              Privacy, in plain language
            </p>
            <h2 className="mt-3 font-editorial text-[2.2rem] leading-[1.03] sm:text-[2.8rem]">
              Your data, used only to review your fit.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              We ask for consent under the Philippine Data Privacy Act of 2012
              (RA 10173) before storing a profile. Resumes and photos live in
              private storage, and only the employer you applied to can open
              your application. You can withdraw consent by requesting data
              removal from the platform administrator.
            </p>
          </div>
          <div className="space-y-2.5 rounded-md border border-border/70 bg-background/60 p-4">
            {[
              "Role-scoped access to every record",
              "Private resume and photo buckets",
              "No selling or third-party profiling",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-[13px]">
                <ShieldCheck className="size-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
            <div className="flex items-center gap-2.5 text-[13px]">
              <BadgeCheck className="size-4 shrink-0 text-primary" />
              <span className="text-muted-foreground">
                Consent captured at sign-up
              </span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[1rem] border border-primary/20 bg-primary px-6 py-14 text-primary-foreground sm:px-12 lg:py-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 18% 18%, rgba(231,192,90,0.34), transparent 44%), radial-gradient(circle at 88% 72%, rgba(255,255,255,0.2), transparent 42%)",
            }}
            aria-hidden="true"
          />
          <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-md border border-primary-foreground/20 bg-primary-foreground/10">
                  <BriefcaseBusiness className="size-4" />
                </span>
                <AnimatedWordmark
                  className="text-xl"
                  animate
                  tone="onPrimary"
                />
              </div>
              <h2 className="mt-5 max-w-xl font-editorial text-[2.7rem] leading-[0.98] text-balance sm:text-[3.6rem]">
                Start with proof. Hire with confidence.
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-primary-foreground/80">
                Create an applicant profile or a company workspace in a couple
                of minutes. Every score arrives with its reasoning, and every
                decision stays human.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-md bg-primary-foreground px-6 text-primary hover:bg-primary-foreground/90"
              >
                <Link to="/auth?mode=signup">
                  Create your account <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-md border-primary-foreground/30 bg-transparent px-6 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <BrandLockup size="sm" animate />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Automated applicant screening, made for the Philippines.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <a href="#how" className="hover:text-foreground">
              How it works
            </a>
            <a href="#engine" className="hover:text-foreground">
              Engine
            </a>
            <a href="#privacy" className="hover:text-foreground">
              Privacy (RA 10173)
            </a>
            <Link to="/app/admin" className="hover:text-foreground">
              Administration
            </Link>
            <Link to="/auth" className="hover:text-foreground">
              Sign in
            </Link>
          </div>
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} TRABALINK. An academic thesis project
            on explainable applicant screening.
          </p>
        </div>
      </footer>
    </div>
  );
}
