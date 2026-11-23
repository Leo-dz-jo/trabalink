import { motion } from "framer-motion";
import { Check, CircleAlert, CircleDashed, Minus, X } from "lucide-react";
import type { ReactNode } from "react";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { BUCKET_LABELS, type QualificationBucket } from "@/lib/scoring";
import { STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

const bucketStyles: Record<QualificationBucket, string> = {
  QUALIFIED: "border-qualified/25 bg-qualified-soft text-qualified",
  CONDITIONALLY_QUALIFIED:
    "border-conditional/25 bg-conditional-soft text-conditional",
  NOT_QUALIFIED: "border-unqualified/25 bg-unqualified-soft text-unqualified",
};

const bucketDot: Record<QualificationBucket, string> = {
  QUALIFIED: "bg-qualified",
  CONDITIONALLY_QUALIFIED: "bg-conditional",
  NOT_QUALIFIED: "bg-unqualified",
};

export function BucketBadge({
  bucket,
  label,
  className,
  compact = false,
}: {
  bucket: QualificationBucket;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border font-mono font-semibold uppercase tracking-[0.04em]",
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[9.5px]",
        bucketStyles[bucket],
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", bucketDot[bucket])}
        aria-hidden="true"
      />
      {label ?? BUCKET_LABELS[bucket]}
    </span>
  );
}

const statusStyles: Record<string, string> = {
  new: "border-border bg-secondary text-secondary-foreground",
  shortlisted: "border-conditional/25 bg-conditional-soft text-conditional",
  rejected: "border-unqualified/20 bg-unqualified-soft text-unqualified",
  hired: "border-qualified/25 bg-qualified-soft text-qualified",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.06em]",
        statusStyles[status] ?? statusStyles.new,
        className,
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function Chip({
  children,
  className,
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: "neutral" | "accent" | "warm";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-2 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.06em]",
        tone === "neutral" &&
          "border-border bg-secondary/70 text-secondary-foreground",
        tone === "accent" &&
          "border-primary/15 bg-accent text-accent-foreground",
        tone === "warm" &&
          "border-conditional/20 bg-conditional-soft text-conditional",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function RequirementStatusIcon({
  status,
  className,
}: {
  status: "matched" | "partial" | "missing";
  className?: string;
}) {
  if (status === "matched") {
    return (
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-sm bg-qualified-soft text-qualified",
          className,
        )}
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-sm bg-conditional-soft text-conditional",
          className,
        )}
      >
        <CircleDashed className="size-3.5" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-sm bg-unqualified-soft text-unqualified",
        className,
      )}
    >
      <X className="size-3.5" strokeWidth={3} />
    </span>
  );
}

const ringColors: Record<QualificationBucket, string> = {
  QUALIFIED: "var(--qualified)",
  CONDITIONALLY_QUALIFIED: "var(--conditional)",
  NOT_QUALIFIED: "var(--unqualified)",
};

export function ScoreRing({
  score,
  bucket,
  size = 64,
  strokeWidth = 5,
  showMax = true,
  className,
}: {
  score: number;
  bucket: QualificationBucket;
  size?: number;
  strokeWidth?: number;
  showMax?: boolean;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score)) / 100;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Qualification score ${score} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-border"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke={ringColors[bucket]}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: circumference - circumference * progress,
          }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* The ring's aria-label announces the score, so the digits stay visual. */}
        <span
          aria-hidden="true"
          className="leading-none"
          style={{ fontSize: Math.max(12, size * 0.3) }}
        >
          <AnimatedNumber value={score} className="font-semibold" />
        </span>
        {showMax && (
          <span className="text-[9px] font-medium text-muted-foreground">
            /100
          </span>
        )}
      </div>
    </div>
  );
}

export function ScoreMeter({
  matched,
  partial,
  missing,
  className,
}: {
  matched: number;
  partial: number;
  missing: number;
  className?: string;
}) {
  const total = Math.max(1, matched + partial + missing);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <motion.span
          className="bg-qualified"
          initial={{ width: 0 }}
          animate={{ width: `${(matched / total) * 100}%` }}
          transition={{ duration: 0.7 }}
        />
        <motion.span
          className="bg-conditional"
          initial={{ width: 0 }}
          animate={{ width: `${(partial / total) * 100}%` }}
          transition={{ duration: 0.7, delay: 0.08 }}
        />
        <motion.span
          className="bg-unqualified/70"
          initial={{ width: 0 }}
          animate={{ width: `${(missing / total) * 100}%` }}
          transition={{ duration: 0.7, delay: 0.16 }}
        />
      </div>
      <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
        {matched} of {total} met
      </span>
    </div>
  );
}

export function BucketLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-qualified" /> Qualified
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-conditional" /> Conditional
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-unqualified" /> Not qualified
      </span>
    </div>
  );
}

export function Flag({
  icon: Icon,
  children,
}: {
  icon: typeof CircleAlert;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm bg-muted px-2 py-1 font-mono text-[9px] uppercase tracking-[0.04em] text-muted-foreground">
      <Icon className="size-3" />
      {children}
    </span>
  );
}

export function MinusDivider() {
  return <Minus className="size-3 text-muted-foreground/50" />;
}
