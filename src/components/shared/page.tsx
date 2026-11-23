import { motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { BucketBadge } from "@/components/shared/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "relative flex flex-col gap-5 border-b border-border/80 pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="flex items-center gap-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-ink">
            <span className="h-px w-6 bg-gold/70" />
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2.5 font-editorial text-[2.35rem] leading-[0.98] text-balance sm:text-[2.9rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground text-pretty">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:pb-1">
          {actions}
        </div>
      )}
    </header>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[0.9rem] border border-dashed border-border bg-card/50 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-lg border border-gold/25 bg-accent text-accent-foreground">
        <Icon className="size-6" />
      </div>
      <h3 className="font-display text-base font-bold">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {children && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}

export function LoadingBlock({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("space-y-3", className)}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="rounded-[0.9rem] border border-border/70 bg-card p-5 card-shadow"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ScreenLoader({
  label = "Loading your workspace",
}: {
  label?: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <motion.div
        className="relative flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground"
        animate={{ rotate: [0, 4, -4, 0] }}
        transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
      >
        <Loader2 className="size-5 animate-spin" />
      </motion.div>
      <p className="text-sm text-muted-foreground">{label}…</p>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[0.9rem] border border-unqualified/20 bg-unqualified-soft px-6 py-10 text-center">
      <AlertCircle className="mb-3 size-7 text-unqualified" />
      <p className="font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  icon: Icon,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/80 card-shadow",
        className,
      )}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-gold/60 via-gold/25 to-transparent"
        aria-hidden="true"
      />
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex min-w-0 gap-3">
          {Icon && (
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-gold/25 bg-accent text-accent-foreground">
              <Icon className="size-4" />
            </div>
          )}
          <div className="min-w-0">
            <CardTitle className="font-display text-base font-bold">
              {title}
            </CardTitle>
            {description && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </CardHeader>
      {children && (
        <CardContent className={contentClassName}>{children}</CardContent>
      )}
    </Card>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  badge,
  className,
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  badge?: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative overflow-hidden rounded-[0.9rem] border border-border/70 bg-card p-5 card-shadow transition-all duration-300 hover:border-gold/40 hover:card-shadow-lg",
        className,
      )}
    >
      <span
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent"
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <div className="flex size-8 items-center justify-center rounded-md border border-gold/25 bg-accent text-accent-foreground transition-colors group-hover:border-gold/50">
            <Icon className="size-4" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <p className="text-[2.15rem] leading-none">
          {typeof value === "number" ? (
            <AnimatedNumber value={value} className="font-semibold" />
          ) : (
            value
          )}
        </p>
        {badge}
      </div>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </motion.div>
  );
}

export function BucketSummary({
  bucket,
  label,
}: {
  bucket: "QUALIFIED" | "CONDITIONALLY_QUALIFIED" | "NOT_QUALIFIED";
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <BucketBadge bucket={bucket} label={label} />
    </div>
  );
}
