import { useQuery } from "convex/react";
import { Compass, Search, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { JobPost, JobPostSkeleton } from "@/components/social/job-post";
import { EmptyState, PageTransition } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { useViewer } from "@/hooks/use-viewer";
import { EMPLOYMENT_TYPES } from "@/lib/constants";
import { scoreApplication, type ScoringRequirement } from "@/lib/scoring";
import { cn } from "@/lib/utils";

type SortKey = "match" | "newest" | "salary";

export default function Jobs() {
  const { applicant } = useViewer();
  const [search, setSearch] = useState("");
  const [employmentType, setEmploymentType] = useState<string>("all");
  const [entryLevelOnly, setEntryLevelOnly] = useState(false);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("match");

  const jobs = useQuery(api.network.feed, {
    tab: "foryou",
    search: search.trim() || undefined,
    employmentType: employmentType === "all" ? undefined : employmentType,
    entryLevelOnly: entryLevelOnly || undefined,
    remoteOnly: remoteOnly || undefined,
  });

  const rows = useMemo(() => {
    if (!jobs) return [];
    const withMatch = jobs.map((job) => ({
      job,
      match: applicant
        ? scoreApplication({
            job: { title: job.title, isEntryLevel: job.isEntryLevel },
            requirements: job.requirements as ScoringRequirement[],
            applicant: {
              skills: applicant.skills,
              education: applicant.education,
              experience: applicant.experience,
              certifications: applicant.certifications,
              isFreshGrad: applicant.isFreshGrad,
            },
          })
        : undefined,
    }));

    return withMatch.sort((a, b) => {
      if (sort === "newest") return b.job.createdAt - a.job.createdAt;
      if (sort === "salary") return (b.job.salaryMax ?? 0) - (a.job.salaryMax ?? 0);
      if (!a.match || !b.match) return b.job.createdAt - a.job.createdAt;
      return b.match.score - a.match.score;
    });
  }, [jobs, applicant, sort]);

  const activeFilters =
    (employmentType !== "all" ? 1 : 0) + (entryLevelOnly ? 1 : 0) + (remoteOnly ? 1 : 0);

  function resetFilters() {
    setSearch("");
    setEmploymentType("all");
    setEntryLevelOnly(false);
    setRemoteOnly(false);
    setSort("match");
  }

  return (
    <PageTransition className="space-y-4">
      <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-ink">
            Role catalog
          </p>
          <h1 className="mt-1.5 font-display text-[1.7rem] font-extrabold leading-tight sm:text-[2rem]">
            Every open role, with the evidence it needs.
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            Follow a company to see its next post first. Each listing shows your live
            qualification score before you apply.
          </p>
        </div>
        {applicant && (
          <span className="inline-flex items-center gap-1.5 pb-1 text-[11px] font-medium text-primary">
            <Sparkles className="size-3" /> Matches update live
          </span>
        )}
      </header>

      <div className="border border-border bg-card p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search role, skill, or location"
              aria-label="Search jobs"
              className="h-9 rounded-md pl-8 pr-8 text-[12px]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:items-center">
            <Select value={employmentType} onValueChange={setEmploymentType}>
              <SelectTrigger className="h-9 w-full rounded-md text-[12px] lg:w-[150px]" aria-label="Employment type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {EMPLOYMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
              <SelectTrigger className="h-9 w-full rounded-md text-[12px] lg:w-[150px]" aria-label="Sort jobs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="match">Best match</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="salary">Highest salary</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-2.5">
          <div className="flex items-center gap-1.5">
            <Switch id="entry-level" checked={entryLevelOnly} onCheckedChange={setEntryLevelOnly} />
            <Label htmlFor="entry-level" className="text-[11px] font-medium">
              Entry level only
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <Switch id="remote" checked={remoteOnly} onCheckedChange={setRemoteOnly} />
            <Label htmlFor="remote" className="text-[11px] font-medium">
              Remote only
            </Label>
          </div>
          {(activeFilters > 0 || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="ml-auto h-7 rounded-md px-2 text-[11px]"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-0.5">
        <p className="text-[11px] text-muted-foreground">
          {jobs === undefined
            ? "Loading roles…"
            : `${rows.length} open role${rows.length === 1 ? "" : "s"}${
                applicant ? " · scored against your profile" : ""
              }`}
        </p>
      </div>

      {jobs === undefined ? (
        <div className="feed-divide border border-border bg-card">
          {[0, 1, 2].map((index) => (
            <JobPostSkeleton key={index} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No roles match those filters"
          description="Try a broader search, clear the filters, or check back — new roles are posted as employers publish them."
          className={cn("border-border bg-card")}
        >
          <Button variant="outline" className="h-9 rounded-lg text-xs" onClick={resetFilters}>
            Clear filters
          </Button>
        </EmptyState>
      ) : (
        <div className="feed-divide border border-border bg-card">
          {rows.map((row, index) => (
            <JobPost
              key={row.job._id}
              job={row.job}
              match={row.match}
              index={index}
            />
          ))}
        </div>
      )}
    </PageTransition>
  );
}
