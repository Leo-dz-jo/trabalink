import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  BriefcaseBusiness,
  CalendarClock,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Chip } from "@/components/shared/badges";
import { EmptyState, PageHeader, PageTransition } from "@/components/shared/page";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDate, formatSalary, pluralise } from "@/lib/format";

export default function EmployerJobs() {
  const jobs = useQuery(api.jobs.listMine);
  const setStatus = useMutation(api.jobs.setStatus);
  const removeJob = useMutation(api.jobs.remove);
  const navigate = useNavigate();
  const [pendingDelete, setPendingDelete] = useState<Id<"jobs"> | null>(null);

  async function toggleStatus(jobId: Id<"jobs">, next: "open" | "closed") {
    try {
      await setStatus({ jobId, status: next });
      toast.success(next === "open" ? "Job reopened." : "Job closed to new applications.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the job.");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await removeJob({ jobId: pendingDelete });
      toast.success("Job deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the job.");
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <PageTransition className="space-y-6">
      <PageHeader
        eyebrow="Job posts"
        title="Your roles, requirements, and pipelines."
        description="Each post carries the weighted requirements that drive applicant ranking. Close a role to stop new applications without losing its history."
        actions={
          <Button asChild className="h-10 rounded-xl px-4">
            <Link to="/app/employer/jobs/new">
              <Plus className="size-4" /> Post a job
            </Link>
          </Button>
        }
      />

      {jobs === undefined ? (
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl border border-border/70 bg-card" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title="No job posts yet"
          description="A strong first post lists 3–6 requirements. Mark the must-haves mandatory and let preferred skills add score instead of blocking people."
        >
          <Button asChild className="h-10 rounded-xl">
            <Link to="/app/employer/jobs/new">Post your first job</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, index) => (
            <motion.div
              key={job._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.04, 0.25) }}
              className="rounded-2xl border border-border/70 bg-card p-5 card-shadow"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/app/employer/jobs/${job._id}/applicants`}
                      className="font-display text-base font-bold underline-offset-4 hover:text-primary hover:underline"
                    >
                      {job.title}
                    </Link>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        job.status === "open"
                          ? "border-qualified/25 bg-qualified-soft text-qualified"
                          : "border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      {job.status === "open" ? "Open" : "Closed"}
                    </span>
                    {job.isEntryLevel && <Chip tone="accent">Entry level</Chip>}
                    {job.isRemote && <Chip>Remote</Chip>}
                  </div>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{job.location}</span>
                    <span>{job.employmentType}</span>
                    <span>{formatSalary(job.salaryMin, job.salaryMax)}</span>
                    {job.deadline && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="size-3" /> Closes {formatDate(job.deadline)}
                      </span>
                    )}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {job.requirements.slice(0, 4).map((requirement) => (
                      <span
                        key={requirement.id}
                        className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {requirement.label}
                      </span>
                    ))}
                    {job.requirements.length > 4 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        +{job.requirements.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link
                    to={`/app/employer/jobs/${job._id}/applicants`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold transition-colors hover:border-primary/30 hover:text-primary"
                  >
                    <Users className="size-3.5" />
                    {pluralise(job.applicationCount, "applicant")}
                  </Link>
                  <Button asChild size="sm" className="h-9 rounded-lg">
                    <Link to={`/app/employer/jobs/${job._id}/applicants`}>Review</Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-lg"
                        aria-label={`Manage ${job.title}`}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Manage job</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => navigate(`/app/employer/jobs/${job._id}/edit`)}
                      >
                        <Pencil className="mr-2 size-4" /> Edit post
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {job.status === "open" ? (
                        <DropdownMenuItem onClick={() => void toggleStatus(job._id, "closed")}>
                          <XCircle className="mr-2 size-4" /> Close applications
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => void toggleStatus(job._id, "open")}>
                          <RotateCcw className="mr-2 size-4" /> Reopen job
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => setPendingDelete(job._id)}
                        className="text-destructive focus:text-destructive"
                        disabled={job.applicationCount > 0}
                      >
                        <Trash2 className="mr-2 size-4" /> Delete job
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-center">
                <div>
                  <p className="font-display text-lg font-extrabold">{job.applicationCount}</p>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    Applicants
                  </p>
                </div>
                <div>
                  <p className="font-display text-lg font-extrabold text-primary">{job.newCount}</p>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    New
                  </p>
                </div>
                <div>
                  <p className="font-display text-lg font-extrabold">{job.shortlistedCount}</p>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    Shortlisted
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job post?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Jobs with applicants cannot be deleted — close them
              instead so application records stay intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Keep job</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void confirmDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
}
