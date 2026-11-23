import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  assertActive,
  cleanMultiline,
  cleanText,
  clampNumber,
  getEmployerProfile,
  requireEmployer,
  requireUser,
  storageUrl,
} from "./lib/access";
import { jobRequirementValidator } from "./schema";
import { notifyFollowers } from "./network";

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship"] as const;

function normaliseRequirements(
  requirements: Array<{
    id: string;
    label: string;
    category: "skill" | "experience" | "education" | "certification" | "other";
    type: "MANDATORY" | "OBTAINABLE_LATER" | "PREFERRED";
    weight: number;
    gracePeriodDays?: number;
    groupId?: string;
    knockoutQuestion?: string;
    matchValue?: string;
    minYears?: number;
  }>,
) {
  if (requirements.length === 0) {
    throw new ConvexError("Add at least one requirement so applicants can be scored.");
  }
  if (requirements.length > 20) {
    throw new ConvexError("A job can have at most 20 requirements.");
  }
  const seen = new Set<string>();
  return requirements.map((requirement, index) => {
    const label = cleanText(requirement.label, 160);
    if (!label) throw new ConvexError("Every requirement needs a name.");
    let id = cleanText(requirement.id, 60) || `req_${index + 1}`;
    while (seen.has(id)) id = `${id}_${index + 1}`;
    seen.add(id);
    return {
      id,
      label,
      category: requirement.category,
      type: requirement.type,
      weight: Math.round(clampNumber(requirement.weight, 0, 100) ?? 20),
      gracePeriodDays:
        requirement.type === "OBTAINABLE_LATER"
          ? Math.round(clampNumber(requirement.gracePeriodDays, 0, 365) ?? 30)
          : undefined,
      groupId: cleanText(requirement.groupId, 60) || undefined,
      knockoutQuestion: cleanText(requirement.knockoutQuestion, 200) || undefined,
      matchValue: cleanText(requirement.matchValue, 160) || undefined,
      minYears:
        requirement.category === "experience"
          ? clampNumber(requirement.minYears, 0, 30)
          : undefined,
    };
  });
}

async function companyFor(ctx: QueryCtx, employerId: Doc<"jobs">["employerId"]) {
  const profile = await getEmployerProfile(ctx, employerId);
  if (profile) {
    return {
      name: profile.companyName,
      industry: profile.industry,
      location: profile.location,
      website: profile.website,
      contactEmail: profile.contactEmail,
      description: profile.description,
      logoUrl: await storageUrl(ctx, profile.logoId),
    };
  }
  const user = await ctx.db.get(employerId);
  return {
    name: user?.name ?? "Company",
    industry: undefined,
    location: undefined,
    website: undefined,
    contactEmail: user?.email,
    description: undefined,
    logoUrl: undefined,
  };
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_employer", (q) => q.eq("employerId", userId))
      .collect();

    const withCounts = await Promise.all(
      jobs.map(async (job) => {
        const applications = await ctx.db
          .query("applications")
          .withIndex("by_job", (q) => q.eq("jobId", job._id))
          .collect();
        return {
          ...job,
          applicationCount: applications.length,
          newCount: applications.filter((application) => application.status === "new")
            .length,
          shortlistedCount: applications.filter(
            (application) => application.status === "shortlisted",
          ).length,
        };
      }),
    );

    return withCounts.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listOpen = query({
  args: {
    search: v.optional(v.string()),
    employmentType: v.optional(v.string()),
    entryLevelOnly: v.optional(v.boolean()),
    remoteOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const now = Date.now();
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    const search = cleanText(args.search, 120).toLowerCase();
    const filtered = jobs.filter((job) => {
      if (job.deadline && job.deadline < now) return false;
      if (args.entryLevelOnly && !job.isEntryLevel) return false;
      if (args.remoteOnly && !job.isRemote) return false;
      if (args.employmentType && job.employmentType !== args.employmentType) return false;
      if (!search) return true;
      const haystack = `${job.title} ${job.description} ${job.location} ${job.requirements
        .map((requirement) => requirement.label)
        .join(" ")}`.toLowerCase();
      return haystack.includes(search);
    });

    const companies = new Map<string, Awaited<ReturnType<typeof companyFor>>>();
    for (const job of filtered) {
      if (!companies.has(job.employerId)) {
        companies.set(job.employerId, await companyFor(ctx, job.employerId));
      }
    }

    return filtered
      .map((job) => ({
        ...job,
        company: companies.get(job.employerId)!,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const get = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const company = await companyFor(ctx, job.employerId);
    const application =
      user.role === "employer"
        ? null
        : await ctx.db
            .query("applications")
            .withIndex("by_job_applicant", (q) =>
              q.eq("jobId", job._id).eq("applicantId", userId),
            )
            .unique();

    return {
      ...job,
      company,
      hasApplied: Boolean(application),
      applicationStatus: application?.status ?? null,
      isOwner: job.employerId === userId,
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    location: v.string(),
    isRemote: v.boolean(),
    employmentType: v.string(),
    salaryMin: v.optional(v.number()),
    salaryMax: v.optional(v.number()),
    isEntryLevel: v.boolean(),
    deadline: v.optional(v.number()),
    requirements: v.array(jobRequirementValidator),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireEmployer(ctx);
    assertActive(user);
    const title = cleanText(args.title, 140);
    const description = cleanMultiline(args.description, 6000);
    if (!title) throw new ConvexError("Job title is required.");
    if (description.length < 40) {
      throw new ConvexError("Describe the role in at least 40 characters.");
    }
    if (!EMPLOYMENT_TYPES.includes(args.employmentType as (typeof EMPLOYMENT_TYPES)[number])) {
      throw new ConvexError("Choose a valid employment type.");
    }
    const location = cleanText(args.location, 120);
    if (!location) throw new ConvexError("Location is required (or mark the role remote).");

    const salaryMin = clampNumber(args.salaryMin, 0, 10_000_000);
    const salaryMax = clampNumber(args.salaryMax, 0, 10_000_000);
    if (salaryMin !== undefined && salaryMax !== undefined && salaryMin > salaryMax) {
      throw new ConvexError("Minimum salary cannot be higher than maximum salary.");
    }
    if (args.deadline && args.deadline < Date.now()) {
      throw new ConvexError("The application deadline must be in the future.");
    }

    const now = Date.now();
    const jobId = await ctx.db.insert("jobs", {
      employerId: userId,
      title,
      description,
      location,
      isRemote: args.isRemote,
      employmentType: args.employmentType,
      salaryMin,
      salaryMax,
      isEntryLevel: args.isEntryLevel,
      deadline: args.deadline,
      requirements: normaliseRequirements(args.requirements),
      status: "open",
      createdAt: now,
      updatedAt: now,
    });

    // Applicants who follow this company hear about the role immediately.
    await notifyFollowers(ctx, {
      _id: jobId,
      employerId: userId,
      title,
      location,
    });

    return jobId;
  },
});

export const update = mutation({
  args: {
    jobId: v.id("jobs"),
    title: v.string(),
    description: v.string(),
    location: v.string(),
    isRemote: v.boolean(),
    employmentType: v.string(),
    salaryMin: v.optional(v.number()),
    salaryMax: v.optional(v.number()),
    isEntryLevel: v.boolean(),
    deadline: v.optional(v.number()),
    requirements: v.array(jobRequirementValidator),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireEmployer(ctx);
    assertActive(user);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.employerId !== userId) {
      throw new ConvexError("You can only edit your own jobs.");
    }
    const title = cleanText(args.title, 140);
    const description = cleanMultiline(args.description, 6000);
    if (!title) throw new ConvexError("Job title is required.");
    if (description.length < 40) {
      throw new ConvexError("Describe the role in at least 40 characters.");
    }
    const location = cleanText(args.location, 120);
    if (!location) throw new ConvexError("Location is required.");
    const salaryMin = clampNumber(args.salaryMin, 0, 10_000_000);
    const salaryMax = clampNumber(args.salaryMax, 0, 10_000_000);
    if (salaryMin !== undefined && salaryMax !== undefined && salaryMin > salaryMax) {
      throw new ConvexError("Minimum salary cannot be higher than maximum salary.");
    }

    await ctx.db.patch(job._id, {
      title,
      description,
      location,
      isRemote: args.isRemote,
      employmentType: args.employmentType,
      salaryMin,
      salaryMax,
      isEntryLevel: args.isEntryLevel,
      deadline: args.deadline,
      requirements: normaliseRequirements(args.requirements),
      updatedAt: Date.now(),
    });
  },
});

export const setStatus = mutation({
  args: {
    jobId: v.id("jobs"),
    status: v.union(v.literal("open"), v.literal("closed")),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireEmployer(ctx);
    assertActive(user);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.employerId !== userId) {
      throw new ConvexError("You can only manage your own jobs.");
    }
    await ctx.db.patch(job._id, { status: args.status, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireEmployer(ctx);
    assertActive(user);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.employerId !== userId) {
      throw new ConvexError("You can only delete your own jobs.");
    }
    const applications = await ctx.db
      .query("applications")
      .withIndex("by_job", (q) => q.eq("jobId", job._id))
      .collect();
    if (applications.length > 0) {
      throw new ConvexError(
        "This job already has applicants. Close it instead of deleting so records stay intact.",
      );
    }
    await ctx.db.delete(job._id);
  },
});
