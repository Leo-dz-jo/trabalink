import { useQuery } from "convex/react";
import { ArrowLeft, BriefcaseBusiness, Pencil, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ApplicantRow, type ApplicantRowData } from "@/components/applicants/applicant-row";
import { BucketLegend, BucketBadge } from "@/components/shared/badges";
import { EmptyState, PageHeader, PageTransition } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDate } from "@/lib/format";
import { type QualificationBucket } from "@/lib/scoring";

type BucketFilter = "ALL" | QualificationBucket;

export default function JobApplicants() {
  const { jobId } = useParams<{ jobId: string }>();
  const [bucket, setBucket] = useState<BucketFilter>("ALL");
  const [search, setSearch] = useState("");

  const job = useQuery(api.jobs.get, jobId ? { jobId: jobId as Id<"jobs"> } : "skip");
  const rows = useQuery(
    api.applications.forJob,
    jobId ? { jobId: jobId as Id<"jobs"> } : "skip",
  );

  const counts = useMemo(() => {
    const base: Record<BucketFilter, number> = {
      ALL: rows?.length ?? 0,
      QUALIFIED: 0,
      CONDITIONALLY_QUALIFIED: 0,
      NOT_QUALIFIED: 0,
    };
    rows?.forEach((row) => {
      base[row.bucket] += 1;
    });
    return base;
  }, [rows]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (rows ?? []).filter((row) => {
      if (bucket !== "ALL" && row.bucket !== bucket) return false;
      if (!term) return true;
      return (
        row.applicant.fullName.toLowerCase().includes(term) ||
        row.applicant.skills.some((skill) => skill.toLowerCase().includes(term)) ||
        (row.applicant.headline ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, bucket, search]);

  if (!jobId) {
    return <EmptyState icon={BriefcaseBusiness} title="Job not found" />;
  }

  if (job === undefined || rows === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded-2xl border border-border/70 bg-card" />
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl border border-border/70 bg-card" />
        ))}
      </div>
    );
  }

  if (job === null) {
    return (
      <EmptyState
        icon={BriefcaseBusiness}
        title="This job is no longer available"
        description="It may have been deleted. Head back to your job posts to review other roles."
      >
        <Button asChild className="h-10 rounded-xl">
          <Link to="/app/employer/jobs">Back to job posts</Link>
        </Button>
      </EmptyState>
    );
  }

  if (!job.isOwner) {
    return (
      <EmptyState
        icon={BriefcaseBusiness}
        title="This job belongs to another company"
        description="Applicant data is private to the employer who posted the role."
      >
        <Button asChild className="h-10 rounded-xl">
          <Link to="/app/employer/jobs">Back to job posts</Link>
        </Button>
      </EmptyState>
    );
  }

  const list: ApplicantRowData[] = visible.map((row) => ({
    applicationId: row.applicationId,
    name: row.applicant.fullName,
    headline: row.applicant.headline,
    location: row.applicant.location,
    skills: row.applicant.skills,
    isFreshGrad: row.applicant.isFreshGrad,
    hasResume: row.applicant.hasResume,
    photoUrl: row.applicant.photoUrl,
    score: row.score,
    bucket: row.bucket,
    matchedCount: row.matchedCount,
    partialCount: row.partialCount,
    missingCount: row.missingCount,
    conditions: row.conditions,
    status: row.status,
    createdAt: row.createdAt,
  }));

  return (
    <PageTransition className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-9 rounded-lg text-muted-foreground">
        <Link to="/app/employer/jobs">
          <ArrowLeft className="size-4" /> Job posts
        </Link>
      </Button>

      <PageHeader
        eyebrow="Applicant review"
        title={job.title}
        description={`${job.location} · ${job.employmentType}${
          job.deadline ? ` · closes ${formatDate(job.deadline)}` : ""
        }`}
        actions={
          <>
            <Button asChild variant="outline" className="h-10 rounded-xl">
              <Link to={`/app/employer/jobs/${job._id}/edit`}>
                <Pencil className="size-4" /> Edit job
              </Link>
            </Button>
            <Button asChild className="h-10 rounded-xl">
              <Link to={`/app/employer/jobs/${job._id}/applicants`}>
                <Users className="size-4" /> {counts.ALL} applicant{counts.ALL === 1 ? "" : "s"}
              </Link>
            </Button>
          </>
        }
      />

      <div className="rounded-2xl border border-border/70 bg-card p-4 card-shadow">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={bucket} onValueChange={(value) => setBucket(value as BucketFilter)}>
            <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-xl bg-muted/60 p-1">
              {(
                [
                  { value: "ALL", label: "All" },
                  { value: "QUALIFIED", label: "Qualified" },
                  { value: "CONDITIONALLY_QUALIFIED", label: "Conditional" },
                  { value: "NOT_QUALIFIED", label: "Not qualified" },
                ] as Array<{ value: BucketFilter; label: string }>
              ).map((option) => (
                <TabsTrigger
                  key={option.value}
                  value={option.value}
                  className="h-8 rounded-lg px-2.5 text-[11px] font-semibold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  {option.label}
                  <span className="ml-1.5 text-[10px] tabular-nums text-muted-foreground">
                    {counts[option.value]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative w-full lg:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or skill"
              className="h-10 rounded-xl pl-8"
              aria-label="Search applicants"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
          <BucketLegend />
          <div className="flex gap-2">
            <BucketBadge bucket="QUALIFIED" compact label={`${counts.QUALIFIED} ready`} />
            <BucketBadge
              bucket="CONDITIONALLY_QUALIFIED"
              compact
              label={`${counts.CONDITIONALLY_QUALIFIED} conditional`}
            />
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Users}
          title={counts.ALL === 0 ? "No applicants yet" : "No applicants in this view"}
          description={
            counts.ALL === 0
              ? "Share the role — as soon as someone applies, their ranked score and breakdown appear here."
              : "Try another bucket or clear the search to see the rest of the pipeline."
          }
        >
          {counts.ALL > 0 && (
            <Button
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => {
                setBucket("ALL");
                setSearch("");
              }}
            >
              Clear filters
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="space-y-2.5">
          {list.map((row, index) => (
            <ApplicantRow key={row.applicationId} row={row} index={index} />
          ))}
        </div>
      )}

      <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
        Ranked by bucket, then score, then application date. Scores are recommendations —
        open an applicant to review evidence and record your decision.
      </p>
    </PageTransition>
  );
}
