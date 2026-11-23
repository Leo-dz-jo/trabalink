import { motion } from "framer-motion";
import { Clock3, FileText, MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { BucketBadge, ScoreRing, StatusBadge } from "@/components/shared/badges";
import { EmptyState, PageHeader, PageTransition } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import { formatDate, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const filters = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
] as const;

export default function Applications() {
  const applications = useQuery(api.applications.mine);
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("all");

  const counts = useMemo(() => {
    const base = { all: applications?.length ?? 0, new: 0, shortlisted: 0, hired: 0, rejected: 0 };
    applications?.forEach((application) => {
      if (application.status in base) {
        base[application.status as keyof typeof base] += 1;
      }
    });
    return base;
  }, [applications]);

  const rows = (applications ?? []).filter(
    (application) => filter === "all" || application.status === filter,
  );

  return (
    <PageTransition className="space-y-6">
      <PageHeader
        eyebrow="My applications"
        title="Every application, with its reasons attached."
        description="Track where each application stands. Conditional applications list the credential or exam you still need to clear — nothing disappears silently."
        actions={
          <Button asChild variant="outline" className="h-10 rounded-xl">
            <Link to="/app/jobs">
              <Search className="size-4" /> Find more roles
            </Link>
          </Button>
        }
      />

      <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-border/70 bg-card p-1 no-scrollbar">
          {filters.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="h-9 shrink-0 rounded-lg px-3 text-xs font-semibold data-[state=active]:bg-accent data-[state=active]:text-primary"
            >
              {item.label}
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                {counts[item.value as keyof typeof counts] ?? 0}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {applications === undefined ? (
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl border border-border/70 bg-card"
            />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No applications yet"
          description="When you apply, the role, your score, and the status will live here. Start with roles where your profile already matches."
        >
          <Button asChild className="h-10 rounded-xl">
            <Link to="/app/jobs">Browse open roles</Link>
          </Button>
        </EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={`Nothing in ${filter}`}
          description="No applications currently have that status. Switch tabs to see the rest of your pipeline."
        >
          <Button variant="outline" className="h-10 rounded-xl" onClick={() => setFilter("all")}>
            Show all applications
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {rows.map((application, index) => (
            <motion.div
              key={application._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.04, 0.25) }}
              className="rounded-2xl border border-border/70 bg-card p-5 card-shadow transition-shadow hover:card-shadow-lg"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  {application.bucket ? (
                    <ScoreRing
                      score={application.score ?? 0}
                      bucket={application.bucket}
                      size={56}
                      showMax={false}
                    />
                  ) : (
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted">
                      <FileText className="size-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/app/jobs/${application.job._id}`}
                        className="font-display text-[15px] font-bold underline-offset-4 hover:text-primary hover:underline"
                      >
                        {application.job.title}
                      </Link>
                      <StatusBadge status={application.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {application.companyName} · applied {timeAgo(application.createdAt)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" />
                        {application.job.isRemote ? "Remote" : application.job.location}
                      </span>
                      <span>{application.job.employmentType}</span>
                      {application.bucket && <BucketBadge bucket={application.bucket} compact />}
                    </div>
                  </div>
                </div>

                {application.conditions.length > 0 ? (
                  <div className="w-full shrink-0 rounded-xl border border-conditional/25 bg-conditional-soft p-3 sm:w-64">
                    <div className="flex items-center gap-1.5">
                      <Clock3 className="size-3.5 text-conditional" />
                      <p className="text-[11px] font-bold text-conditional">
                        {application.conditions.length} condition
                        {application.conditions.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      {application.conditions.slice(0, 2).map((condition) => (
                        <li key={condition.requirementId} className="text-[10px] leading-relaxed">
                          <span className="font-semibold">{condition.label}</span>
                          {condition.deadline ? ` · by ${formatDate(condition.deadline)}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="hidden shrink-0 rounded-xl bg-muted/50 px-3 py-2 text-[10px] text-muted-foreground sm:block">
                    Awaiting human review
                  </div>
                )}
              </div>

              {application.coverNote && (
                <p className="mt-3 line-clamp-2 rounded-xl bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                  “{application.coverNote}”
                </p>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
                <p
                  className={cn(
                    "text-[10px] text-muted-foreground",
                    application.status === "hired" && "font-semibold text-qualified",
                  )}
                >
                  {application.status === "new"
                    ? "Submitted and waiting for the hiring team."
                    : application.status === "shortlisted"
                      ? "Shortlisted — expect a message from the employer."
                      : application.status === "hired"
                        ? "Hired. Congratulations!"
                        : "Reviewed by the employer. You can keep applying elsewhere."}
                </p>
                <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg text-xs">
                  <Link to={`/app/jobs/${application.job._id}`}>View role →</Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
