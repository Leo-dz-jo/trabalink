import { useQuery } from "convex/react";
import { Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ApplicantRow, type ApplicantRowData } from "@/components/applicants/applicant-row";
import { BucketBadge } from "@/components/shared/badges";
import { EmptyState, PageHeader, PageTransition } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { type QualificationBucket } from "@/lib/scoring";

type BucketFilter = "ALL" | QualificationBucket;

export default function EmployerPipeline() {
  const jobs = useQuery(api.jobs.listMine);
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [bucket, setBucket] = useState<BucketFilter>("ALL");
  const [search, setSearch] = useState("");

  const rows = useQuery(api.applications.pipeline, {
    jobId: jobFilter === "all" ? undefined : (jobFilter as Id<"jobs">),
  });

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

  const visible: ApplicantRowData[] = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (rows ?? [])
      .filter((row) => {
        if (bucket !== "ALL" && row.bucket !== bucket) return false;
        if (!term) return true;
        return (
          row.applicant.fullName.toLowerCase().includes(term) ||
          row.jobTitle.toLowerCase().includes(term) ||
          row.applicant.skills.some((skill) => skill.toLowerCase().includes(term))
        );
      })
      .map((row) => ({
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
        conditions: row.conditions.length,
        status: row.status,
        createdAt: row.createdAt,
        jobTitle: row.jobTitle,
      }));
  }, [rows, bucket, search]);

  return (
    <PageTransition className="space-y-6">
      <PageHeader
        eyebrow="Applicant pipeline"
        title="Every applicant, ranked with reasons."
        description="Filter by role or qualification bucket, then open a candidate to read the requirement-by-requirement breakdown, resume, and credentials."
        actions={
          <Button asChild className="h-10 rounded-xl px-4">
            <Link to="/app/employer/jobs/new">Post a job</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "In pipeline", value: counts.ALL, tone: "text-foreground" },
          { label: "Qualified", value: counts.QUALIFIED, tone: "text-qualified" },
          {
            label: "Conditional",
            value: counts.CONDITIONALLY_QUALIFIED,
            tone: "text-conditional",
          },
          { label: "Not qualified", value: counts.NOT_QUALIFIED, tone: "text-unqualified" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border/70 bg-card p-4 card-shadow"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
              {stat.label}
            </p>
            <p className={`mt-1.5 font-display text-2xl font-extrabold ${stat.tone}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 card-shadow">
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
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="h-10 w-full rounded-xl sm:w-[210px]" aria-label="Filter by job">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {jobs?.map((job) => (
                  <SelectItem key={job._id} value={job._id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, skill, or role"
                className="h-10 rounded-xl pl-8"
                aria-label="Search pipeline"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
          <span>Ordered by bucket, then score.</span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-qualified" /> Ready
            <span className="ml-2 size-1.5 rounded-full bg-conditional" /> Conditional
            <span className="ml-2 size-1.5 rounded-full bg-unqualified" /> Missing a must-have
          </span>
        </div>
      </div>

      {rows === undefined ? (
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-border/70 bg-card" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Users}
          title={counts.ALL === 0 ? "Your pipeline is empty" : "No candidates in this view"}
          description={
            counts.ALL === 0
              ? "Post a role and applicants will appear here with a transparent score and full evidence trail."
              : "Try a different bucket, role, or search term."
          }
        >
          <Button
            variant="outline"
            className="h-10 rounded-xl"
            onClick={() => {
              setBucket("ALL");
              setSearch("");
              setJobFilter("all");
            }}
          >
            Reset filters
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-2.5">
          {visible.map((row, index) => (
            <ApplicantRow key={row.applicationId} row={row} index={index} />
          ))}
        </div>
      )}

      {visible.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-3">
          <p className="text-[11px] text-muted-foreground">
            Showing {visible.length} of {counts.ALL} applicants
          </p>
          <div className="flex gap-1.5">
            <BucketBadge bucket="QUALIFIED" compact />
            <BucketBadge bucket="CONDITIONALLY_QUALIFIED" compact />
          </div>
        </div>
      )}
    </PageTransition>
  );
}
