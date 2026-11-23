import { motion } from "framer-motion";
import { ArrowRight, FileText, GraduationCap, MapPin } from "lucide-react";
import { Link } from "react-router";
import { BucketBadge, ScoreRing, StatusBadge } from "@/components/shared/badges";
import { UserAvatar } from "@/components/shared/user-avatar";
import { timeAgo } from "@/lib/format";
import { type QualificationBucket } from "@/lib/scoring";

export interface ApplicantRowData {
  applicationId: string;
  name: string;
  headline?: string;
  location?: string;
  skills: string[];
  isFreshGrad: boolean;
  hasResume: boolean;
  photoUrl?: string;
  score: number;
  bucket: QualificationBucket;
  matchedCount: number;
  partialCount: number;
  missingCount: number;
  conditions: number;
  status: string;
  createdAt: number;
  jobTitle?: string;
}

export function ApplicantRow({
  row,
  index = 0,
}: {
  row: ApplicantRowData;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.3) }}
    >
      <Link
        to={`/app/employer/applications/${row.applicationId}`}
        className="group block rounded-2xl border border-border/70 bg-card p-4 card-shadow transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:card-shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <div className="flex items-start gap-3.5">
          <ScoreRing score={row.score} bucket={row.bucket} size={58} showMax={false} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <UserAvatar name={row.name} src={row.photoUrl} className="size-6" />
              <p className="truncate text-sm font-bold group-hover:text-primary">{row.name}</p>
              <StatusBadge status={row.status} />
              {row.isFreshGrad && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                  <GraduationCap className="size-3" /> Fresh grad
                </span>
              )}
            </div>
            <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
              {row.headline ?? "Applicant"}
              {row.jobTitle ? ` · ${row.jobTitle}` : ""}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
              {row.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" /> {row.location}
                </span>
              )}
              {row.hasResume && (
                <span className="inline-flex items-center gap-1">
                  <FileText className="size-3" /> Resume
                </span>
              )}
              <span>Applied {timeAgo(row.createdAt)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {row.skills.slice(0, 4).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {skill}
                </span>
              ))}
              {row.skills.length > 4 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  +{row.skills.length - 4}
                </span>
              )}
            </div>
          </div>
          <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
            <BucketBadge bucket={row.bucket} compact />
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="font-semibold text-qualified">{row.matchedCount} met</span>
              <span className="font-semibold text-conditional">{row.partialCount} partial</span>
              <span className="font-semibold text-unqualified">{row.missingCount} missing</span>
            </div>
            {row.conditions > 0 && (
              <span className="text-[10px] font-medium text-conditional">
                {row.conditions} condition{row.conditions === 1 ? "" : "s"}
              </span>
            )}
            <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Review <ArrowRight className="size-3" />
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 sm:hidden">
          <BucketBadge bucket={row.bucket} compact />
          <span className="text-[10px] text-muted-foreground">
            {row.matchedCount} met · {row.missingCount} missing
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
