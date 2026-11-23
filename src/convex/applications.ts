import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  assertActive,
  cleanMultiline,
  cleanText,
  requireApplicant,
  requireEmployer,
  requireUser,
  storageUrl,
} from "./lib/access";
import { notify } from "./lib/notify";
import {
  scoreApplication,
  type ApplicantSnapshot,
  type QualificationResult,
  type ScoringRequirement,
} from "../lib/scoring";

function snapshotOf(profile: Doc<"applicantProfiles">): ApplicantSnapshot {
  return {
    skills: profile.skills,
    education: profile.education.map((entry) => ({
      school: entry.school,
      course: entry.course,
      yearGraduated: entry.yearGraduated,
      gpa: entry.gpa,
      honors: entry.honors,
    })),
    experience: profile.experience.map((entry) => ({
      title: entry.title,
      company: entry.company,
      startYear: entry.startYear,
      endYear: entry.endYear,
      description: entry.description,
    })),
    certifications: profile.certifications.map((entry) => ({
      name: entry.name,
      issuer: entry.issuer,
      status: entry.status,
      date: entry.date,
      expiry: entry.expiry,
    })),
    isFreshGrad: profile.isFreshGrad,
  };
}

function scoreFor(
  job: Doc<"jobs">,
  profile: Doc<"applicantProfiles">,
  knockoutAnswers?: Record<string, string>,
  appliedAt?: number,
): QualificationResult {
  return scoreApplication({
    job: { title: job.title, isEntryLevel: job.isEntryLevel },
    requirements: job.requirements as ScoringRequirement[],
    applicant: snapshotOf(profile),
    knockoutAnswers,
    appliedAt: appliedAt ? new Date(appliedAt).toISOString() : undefined,
  });
}

const bucketOrder: Record<QualificationResult["bucket"], number> = {
  QUALIFIED: 0,
  CONDITIONALLY_QUALIFIED: 1,
  NOT_QUALIFIED: 2,
};

export const apply = mutation({
  args: {
    jobId: v.id("jobs"),
    coverNote: v.optional(v.string()),
    knockoutAnswers: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    const { userId, profile, user } = await requireApplicant(ctx);
    assertActive(user);
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new ConvexError("This job no longer exists.");
    if (job.status !== "open") throw new ConvexError("This job is no longer accepting applications.");
    if (job.deadline && job.deadline < Date.now()) {
      throw new ConvexError("The application deadline has passed.");
    }

    const existing = await ctx.db
      .query("applications")
      .withIndex("by_job_applicant", (q) =>
        q.eq("jobId", job._id).eq("applicantId", userId),
      )
      .unique();
    if (existing) throw new ConvexError("You have already applied to this job.");

    const answers: Record<string, string> = {};
    for (const requirement of job.requirements) {
      if (!requirement.knockoutQuestion) continue;
      const answer = args.knockoutAnswers?.[requirement.id]?.toLowerCase();
      if (answer !== "yes" && answer !== "no") {
        throw new ConvexError(`Please answer: ${requirement.knockoutQuestion}`);
      }
      answers[requirement.id] = answer;
    }

    const now = Date.now();
    const applicationId = await ctx.db.insert("applications", {
      jobId: job._id,
      applicantId: userId,
      coverNote: cleanMultiline(args.coverNote, 2000) || undefined,
      knockoutAnswers: Object.keys(answers).length > 0 ? answers : undefined,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });

    const result = scoreFor(job, profile, answers, now);
    return {
      applicationId,
      bucket: result.bucket,
      score: result.score,
      summary: result.summary,
    };
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const profile = await ctx.db
      .query("applicantProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const applications = await ctx.db
      .query("applications")
      .withIndex("by_applicant", (q) => q.eq("applicantId", userId))
      .collect();

    const rows = await Promise.all(
      applications.map(async (application) => {
        const job = await ctx.db.get(application.jobId);
        if (!job) return null;
        const employer = await ctx.db
          .query("employerProfiles")
          .withIndex("by_user", (q) => q.eq("userId", job.employerId))
          .unique();
        const result = profile
          ? scoreFor(job, profile, application.knockoutAnswers, application.createdAt)
          : null;
        return {
          _id: application._id,
          status: application.status,
          createdAt: application.createdAt,
          coverNote: application.coverNote,
          job: {
            _id: job._id,
            title: job.title,
            location: job.location,
            isRemote: job.isRemote,
            employmentType: job.employmentType,
            isEntryLevel: job.isEntryLevel,
          },
          companyName: employer?.companyName ?? "Company",
          score: result?.score ?? null,
          bucket: result?.bucket ?? null,
          conditions: result?.conditions ?? [],
        };
      }),
    );

    return rows
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const forJob = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const { userId } = await requireEmployer(ctx);
    const job = await ctx.db.get(args.jobId);
    // Return an empty pipeline rather than an error for a job this employer
    // does not own: job IDs should never reveal whether someone else's post
    // has applicants.
    if (!job || job.employerId !== userId) return [];

    const applications = await ctx.db
      .query("applications")
      .withIndex("by_job", (q) => q.eq("jobId", job._id))
      .collect();

    const rows = await Promise.all(
      applications.map(async (application) => {
        const profile = await ctx.db
          .query("applicantProfiles")
          .withIndex("by_user", (q) => q.eq("userId", application.applicantId))
          .unique();
        if (!profile) return null;
        const result = scoreFor(
          job,
          profile,
          application.knockoutAnswers,
          application.createdAt,
        );
        return {
          applicationId: application._id,
          status: application.status,
          createdAt: application.createdAt,
          appliedLate: Boolean(job.deadline && application.createdAt > job.deadline),
          score: result.score,
          bucket: result.bucket,
          summary: result.summary,
          matchedCount: result.matched.length,
          partialCount: result.partial.length,
          missingCount: result.missing.length,
          conditions: result.conditions.length,
          applicant: {
            userId: application.applicantId,
            fullName: profile.fullName,
            headline: profile.headline,
            location: profile.location,
            skills: profile.skills.slice(0, 6),
            isFreshGrad: profile.isFreshGrad,
            photoUrl: await storageUrl(ctx, profile.photoId),
            hasResume: Boolean(profile.resumeId),
          },
        };
      }),
    );

    return rows
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort(
        (a, b) =>
          bucketOrder[a.bucket] - bucketOrder[b.bucket] ||
          b.score - a.score ||
          b.createdAt - a.createdAt,
      );
  },
});

export const pipeline = query({
  args: { jobId: v.optional(v.id("jobs")) },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_employer", (q) => q.eq("employerId", userId))
      .collect();
    const scoped = args.jobId
      ? jobs.filter((job) => job._id === args.jobId)
      : jobs;

    const rows: Array<{
      applicationId: Doc<"applications">["_id"];
      status: Doc<"applications">["status"];
      createdAt: number;
      score: number;
      bucket: QualificationResult["bucket"];
      summary: string;
      matchedCount: number;
      partialCount: number;
      missingCount: number;
      conditions: QualificationResult["conditions"];
      jobId: Doc<"jobs">["_id"];
      jobTitle: string;
      applicant: {
        fullName: string;
        headline?: string;
        location?: string;
        skills: string[];
        isFreshGrad: boolean;
        hasResume: boolean;
        photoUrl?: string;
      };
    }> = [];

    for (const job of scoped) {
      const applications = await ctx.db
        .query("applications")
        .withIndex("by_job", (q) => q.eq("jobId", job._id))
        .collect();
      for (const application of applications) {
        const profile = await ctx.db
          .query("applicantProfiles")
          .withIndex("by_user", (q) => q.eq("userId", application.applicantId))
          .unique();
        if (!profile) continue;
        const result = scoreFor(
          job,
          profile,
          application.knockoutAnswers,
          application.createdAt,
        );
        rows.push({
          applicationId: application._id,
          status: application.status,
          createdAt: application.createdAt,
          score: result.score,
          bucket: result.bucket,
          summary: result.summary,
          matchedCount: result.matched.length,
          partialCount: result.partial.length,
          missingCount: result.missing.length,
          conditions: result.conditions,
          jobId: job._id,
          jobTitle: job.title,
          applicant: {
            fullName: profile.fullName,
            headline: profile.headline,
            location: profile.location,
            skills: profile.skills.slice(0, 6),
            isFreshGrad: profile.isFreshGrad,
            hasResume: Boolean(profile.resumeId),
            photoUrl: await storageUrl(ctx, profile.photoId),
          },
        });
      }
    }

    return rows.sort(
      (a, b) =>
        bucketOrder[a.bucket] - bucketOrder[b.bucket] ||
        b.score - a.score ||
        b.createdAt - a.createdAt,
    );
  },
});

export const detail = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const application = await ctx.db.get(args.applicationId);
    if (!application) return null;
    const job = await ctx.db.get(application.jobId);
    if (!job) return null;

    const isEmployer = job.employerId === userId;
    const isApplicant = application.applicantId === userId;
    if (!isEmployer && !isApplicant) return null;

    const profile = await ctx.db
      .query("applicantProfiles")
      .withIndex("by_user", (q) => q.eq("userId", application.applicantId))
      .unique();
    if (!profile) return null;

    const employerProfile = await ctx.db
      .query("employerProfiles")
      .withIndex("by_user", (q) => q.eq("userId", job.employerId))
      .unique();

    const result = scoreFor(
      job,
      profile,
      application.knockoutAnswers,
      application.createdAt,
    );

    return {
      application: {
        _id: application._id,
        status: application.status,
        employerNote: application.employerNote,
        coverNote: application.coverNote,
        knockoutAnswers: application.knockoutAnswers,
        createdAt: application.createdAt,
      },
      job: {
        _id: job._id,
        title: job.title,
        location: job.location,
        employmentType: job.employmentType,
        isEntryLevel: job.isEntryLevel,
        requirements: job.requirements,
      },
      companyName: employerProfile?.companyName ?? "Company",
      isEmployer,
      applicant: {
        userId: profile.userId,
        fullName: profile.fullName,
        headline: profile.headline,
        bio: profile.bio,
        location: profile.location,
        phone: profile.phone,
        email: (await ctx.db.get(profile.userId))?.email,
        skills: profile.skills,
        education: profile.education,
        experience: profile.experience,
        certifications: profile.certifications,
        github: profile.github,
        linkedin: profile.linkedin,
        portfolio: profile.portfolio,
        isFreshGrad: profile.isFreshGrad,
        photoUrl: await storageUrl(ctx, profile.photoId),
        resumeUrl: await storageUrl(ctx, profile.resumeId),
        resumeName: profile.resumeName,
      },
      score: result,
    };
  },
});

export const setStatus = mutation({
  args: {
    applicationId: v.id("applications"),
    status: v.union(
      v.literal("new"),
      v.literal("shortlisted"),
      v.literal("rejected"),
      v.literal("hired"),
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireEmployer(ctx);
    assertActive(user);
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new ConvexError("Application not found.");
    const job = await ctx.db.get(application.jobId);
    if (!job || job.employerId !== userId) {
      throw new ConvexError("You can only manage applications to your own jobs.");
    }
    await ctx.db.patch(application._id, {
      status: args.status,
      employerNote:
        args.note !== undefined
          ? cleanMultiline(args.note, 1000) || undefined
          : application.employerNote,
      updatedAt: Date.now(),
    });

    if (application.status !== args.status) {
      const company = await ctx.db
        .query("employerProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique();
      const statusCopy: Record<string, string> = {
        new: "moved your application back to review",
        shortlisted: "shortlisted your application",
        rejected: "closed your application",
        hired: "marked your application as hired",
      };
      await notify(ctx, {
        userId: application.applicantId,
        kind: "application_status",
        title: `${company?.companyName ?? "An employer"} ${statusCopy[args.status]}`,
        body: `Role: ${job.title}. Open your tracker for the full decision record.`,
        href: "/app/applications",
        jobId: job._id,
        actorId: userId,
      });
    }
  },
});

export const setNote = mutation({
  args: { applicationId: v.id("applications"), note: v.string() },
  handler: async (ctx, args) => {
    const { userId, user } = await requireEmployer(ctx);
    assertActive(user);
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new ConvexError("Application not found.");
    const job = await ctx.db.get(application.jobId);
    if (!job || job.employerId !== userId) {
      throw new ConvexError("You can only add notes to your own applicants.");
    }
    await ctx.db.patch(application._id, {
      employerNote: cleanText(args.note, 1000) || undefined,
      updatedAt: Date.now(),
    });
  },
});

interface PipelineApplication {
  application: Doc<"applications">;
  job: Doc<"jobs">;
  profile: Doc<"applicantProfiles">;
  result: QualificationResult;
}

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_employer", (q) => q.eq("employerId", userId))
      .collect();

    const pipeline: PipelineApplication[] = [];
    for (const job of jobs) {
      const applications = await ctx.db
        .query("applications")
        .withIndex("by_job", (q) => q.eq("jobId", job._id))
        .collect();
      for (const application of applications) {
        const profile = await ctx.db
          .query("applicantProfiles")
          .withIndex("by_user", (q) => q.eq("userId", application.applicantId))
          .unique();
        if (!profile) continue;
        pipeline.push({
          application,
          job,
          profile,
          result: scoreFor(
            job,
            profile,
            application.knockoutAnswers,
            application.createdAt,
          ),
        });
      }
    }

    const recent = await Promise.all(
      [...pipeline]
        .sort((a, b) => b.application.createdAt - a.application.createdAt)
        .slice(0, 6)
        .map(async (row) => ({
          applicationId: row.application._id,
          applicantName: row.profile.fullName,
          jobId: row.job._id,
          jobTitle: row.job.title,
          score: row.result.score,
          bucket: row.result.bucket,
          status: row.application.status,
          createdAt: row.application.createdAt,
          photoUrl: await storageUrl(ctx, row.profile.photoId),
        })),
    );

    const pendingConditions = pipeline
      .filter(
        (row) => row.application.status === "new" || row.application.status === "shortlisted",
      )
      .flatMap((row) =>
        row.result.conditions.map((condition) => ({
          applicationId: row.application._id,
          applicantName: row.profile.fullName,
          jobId: row.job._id,
          jobTitle: row.job.title,
          label: condition.label,
          detail: condition.detail,
          deadline: condition.deadline,
          status: row.application.status,
        })),
      )
      .sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"))
      .slice(0, 8);

    return {
      totalJobs: jobs.length,
      openJobs: jobs.filter((job) => job.status === "open").length,
      totalApplicants: pipeline.length,
      newApplicants: pipeline.filter((row) => row.application.status === "new").length,
      shortlisted: pipeline.filter((row) => row.application.status === "shortlisted")
        .length,
      conditional: pipeline.filter(
        (row) => row.result.bucket === "CONDITIONALLY_QUALIFIED",
      ).length,
      qualified: pipeline.filter((row) => row.result.bucket === "QUALIFIED").length,
      recent,
      pendingConditions,
    };
  },
});
