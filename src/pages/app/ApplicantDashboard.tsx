import { useQuery } from "convex/react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  Compass,
  MapPin,
  Search,
  Sparkles,
  UserRound,
  Video,
} from "lucide-react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router";
import { FollowButton } from "@/components/social/follow-button";
import { JobPost, JobPostSkeleton } from "@/components/social/job-post";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { EmptyState } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useViewer } from "@/hooks/use-viewer";
import { formatDate } from "@/lib/format";
import { applicantCompleteness } from "@/lib/profile";
import { scoreApplication, type ScoringRequirement } from "@/lib/scoring";
import { cn } from "@/lib/utils";

type FeedTab = "foryou" | "following" | "saved";

const TABS: Array<{ value: FeedTab; label: string }> = [
  { value: "foryou", label: "For you" },
  { value: "following", label: "Following" },
  { value: "saved", label: "Saved" },
];

export function ApplicantDashboard() {
  const { viewer, applicant } = useViewer();
  const navigate = useNavigate();
  const [tab, setTab] = useState<FeedTab>("foryou");
  const [search, setSearch] = useState("");
  // Captured once per mount so rendering never reads the clock directly.
  const [now] = useState(() => Date.now());
  const feed = useQuery(api.network.feed, {
    tab,
    search: search.trim() || undefined,
  });
  const companies = useQuery(api.network.companies, {});
  const interviews = useQuery(api.interviews.forApplicant);

  const completeness = applicantCompleteness(applicant);
  const firstName =
    applicant?.fullName?.split(" ")[0] ??
    viewer?.user.name?.split(" ")[0] ??
    "there";

  const rows = useMemo(() => {
    if (!feed) return [];
    return feed.map((job) => ({
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
  }, [feed, applicant]);

  const followed = companies?.filter((company) => company.following) ?? [];
  const suggested = companies?.filter((company) => !company.following) ?? [];
  const upcoming = (interviews ?? [])
    .filter(
      (interview) =>
        interview.status === "scheduled" && interview.scheduledAt >= now,
    )
    .sort((a, b) => a.scheduledAt - b.scheduledAt);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-ink">
            Home feed
          </p>
          <h1 className="mt-1.5 font-display text-[1.7rem] font-extrabold leading-tight sm:text-[2rem]">
            {applicant ? `Hi ${firstName}.` : `Welcome, ${firstName}.`}
          </h1>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
            {applicant
              ? `Roles from companies you follow, ranked by your evidence. Profile strength ${completeness.percent}%.`
              : "Follow companies and add your profile so every role shows an honest match score."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="h-9 rounded-lg px-3 text-xs">
            <Link to="/app/resume">
              <Sparkles className="size-3.5" /> Resume studio
            </Link>
          </Button>
          <Button asChild className="h-9 rounded-lg px-3 text-xs">
            <Link to="/app/jobs">
              <Compass className="size-3.5" /> Browse roles
            </Link>
          </Button>
        </div>
      </header>

      {!applicant && (
        <div className="flex flex-col gap-3 border border-conditional/30 bg-conditional-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <UserRound className="mt-0.5 size-4 shrink-0 text-conditional" />
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              <span className="font-bold text-foreground">Finish your profile.</span>{" "}
              Employers cannot review an empty profile and match scores need your
              skills, education, and resume.
            </p>
          </div>
          <Button
            size="sm"
            className="h-8 shrink-0 rounded-lg text-xs"
            onClick={() => navigate("/app/profile?onboarding=1")}
          >
            Complete profile
          </Button>
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_302px]">
        <section className="min-w-0">
          <div className="flex flex-col gap-2 border border-border bg-card px-2 py-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-0.5">
              {TABS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTab(option.value)}
                  className={cn(
                    "relative h-8 rounded-md px-3 text-[12px] font-semibold transition-colors",
                    tab === option.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="relative sm:ml-auto sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search the feed"
                aria-label="Search the job feed"
                className="h-8 rounded-md pl-8 text-[12px]"
              />
            </div>
          </div>

          {feed === undefined ? (
            <div className="feed-divide border border-t-0 border-border bg-card">
              {[0, 1, 2].map((index) => (
                <JobPostSkeleton key={index} />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="border border-t-0 border-border bg-card">
              <EmptyState
                icon={tab === "saved" ? BriefcaseBusiness : Compass}
                title={
                  tab === "following"
                    ? "No roles from companies you follow"
                    : tab === "saved"
                      ? "No saved roles yet"
                      : "No roles match that search"
                }
                description={
                  tab === "following"
                    ? "Follow a few companies and their new posts land here first."
                    : tab === "saved"
                      ? "Save a role from the feed to keep it for later."
                      : "Try a shorter search, or switch back to For you."
                }
                className="border-0 bg-transparent"
              >
                {tab !== "foryou" ? (
                  <Button
                    variant="outline"
                    className="h-9 rounded-lg text-xs"
                    onClick={() => setTab("foryou")}
                  >
                    Back to For you
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="h-9 rounded-lg text-xs"
                    onClick={() => setSearch("")}
                  >
                    Clear search
                  </Button>
                )}
              </EmptyState>
            </div>
          ) : (
            <div className="feed-divide border border-t-0 border-border bg-card">
              {rows.map((row, index) => (
                <JobPost
                  key={row.job._id}
                  job={row.job}
                  match={row.match}
                  index={index}
                />
              ))}
              <div className="flex items-center justify-between px-4 py-3 sm:px-5">
                <p className="text-[11px] text-muted-foreground">
                  {rows.length} open role{rows.length === 1 ? "" : "s"} · every post
                  shows its requirements
                </p>
                <Button asChild variant="ghost" size="sm" className="h-8 rounded-md px-2 text-[11px]">
                  <Link to="/app/jobs">
                    Full catalog <ArrowRight className="size-3" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-3">
          <section className="border border-border bg-card p-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-bold">Profile strength</h2>
              <span className="text-base font-semibold text-primary">
                <AnimatedNumber value={completeness.percent} />%
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${completeness.percent}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <ul className="mt-2.5 space-y-1.5">
              {(completeness.suggestions.length > 0
                ? completeness.suggestions.slice(0, 3)
                : [
                    "Keep your resume current",
                    "Add new certifications when earned",
                  ]
              ).map((suggestion) => (
                <li key={suggestion} className="flex items-start gap-1.5 text-[11px]">
                  <span className="mt-1 size-1 shrink-0 rounded-full bg-conditional" />
                  <span className="text-muted-foreground">{suggestion}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2.5 flex gap-1.5">
              <Button asChild variant="outline" size="sm" className="h-8 flex-1 rounded-md text-[11px]">
                <Link to="/app/profile">Edit profile</Link>
              </Button>
              <Button asChild size="sm" className="h-8 flex-1 rounded-md text-[11px]">
                <Link to="/app/resume">Resume AI</Link>
              </Button>
            </div>
          </section>

          <section className="border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
              <h2 className="flex items-center gap-1.5 text-[12px] font-bold">
                <CalendarClock className="size-3.5 text-primary" /> Up next
              </h2>
                              <Button asChild variant="ghost" size="sm" className="h-9 min-w-9 px-2 text-[11px]">
                  <Link to="/app/interviews">All</Link>
                </Button>
            </div>
            {interviews === undefined ? (
              <div className="space-y-2 p-3">
                {[0, 1].map((index) => (
                  <div key={index} className="h-10 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <p className="px-3.5 py-3 text-[11px] leading-relaxed text-muted-foreground">
                No interviews booked yet. When an employer schedules one, it appears
                here with the date, time, and format.
              </p>
            ) : (
              <ul className="feed-divide">
                {upcoming.slice(0, 3).map((interview) => (
                  <li key={interview._id} className="px-3.5 py-2.5">
                    <p className="truncate text-[12px] font-semibold">
                      {interview.jobTitle}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {interview.companyName}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-primary">
                      {interview.mode === "video" ? (
                        <Video className="size-3" />
                      ) : (
                        <MapPin className="size-3" />
                      )}
                      {formatDate(interview.scheduledAt)} ·{" "}
                      {new Date(interview.scheduledAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border border-border bg-card">
            <div className="border-b border-border px-3.5 py-2.5">
              <h2 className="text-[12px] font-bold">Companies you follow</h2>
            </div>
            {companies === undefined ? (
              <div className="space-y-2 p-3">
                {[0, 1].map((index) => (
                  <div key={index} className="h-10 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : followed.length === 0 ? (
              <p className="px-3.5 py-3 text-[11px] leading-relaxed text-muted-foreground">
                You are not following any company yet. Follow one to get notified the
                moment it posts a role.
              </p>
            ) : (
              <ul className="feed-divide">
                {followed.slice(0, 4).map((company) => (
                  <li key={company.employerId} className="flex items-center gap-2 px-3.5 py-2.5">
                    <CompanyAvatar name={company.name} logoUrl={company.logoUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold">{company.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {company.openRoles} open role{company.openRoles === 1 ? "" : "s"}
                      </p>
                    </div>
                    <FollowButton
                      employerId={company.employerId}
                      following
                      size="xs"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {suggested.length > 0 && (
            <section className="border border-border bg-card">
              <div className="border-b border-border px-3.5 py-2.5">
                <h2 className="text-[12px] font-bold">Suggested companies</h2>
              </div>
              <ul className="feed-divide">
                {suggested.slice(0, 3).map((company) => (
                  <li key={company.employerId} className="flex items-center gap-2 px-3.5 py-2.5">
                    <CompanyAvatar name={company.name} logoUrl={company.logoUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold">{company.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {company.industry ?? "Hiring"} · {company.openRoles} role
                        {company.openRoles === 1 ? "" : "s"}
                      </p>
                    </div>
                    <FollowButton
                      employerId={company.employerId}
                      following={false}
                      size="xs"
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="px-1 text-[10px] leading-relaxed text-muted-foreground">
            Scores are recommendations built from your profile evidence. A person at
            the company always makes the decision. Scores update as your profile changes.
          </p>
        </aside>
      </div>
    </div>
  );
}

function CompanyAvatar({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl?: string;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="size-8 shrink-0 rounded-md border border-border object-cover"
      />
    );
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 font-display text-[11px] font-bold text-primary">
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}
