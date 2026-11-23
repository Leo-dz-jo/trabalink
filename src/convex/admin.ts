import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  cleanText,
  requireAdmin,
  requireUser,
  storageUrl,
} from "./lib/access";
import { isDemoEmail } from "../lib/demo";

async function anyAdmin(ctx: Parameters<typeof requireUser>[0]) {
  const admins = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "admin"))
    .take(1);
  return admins.length > 0;
}

export const status = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    return {
      isAdmin: user.role === "admin",
      adminExists: await anyAdmin(ctx),
    };
  },
});

/**
 * Founding-administrator setup for an academic deployment. This only works
 * while no administrator exists, so it cannot be used to escalate later.
 */
export const bootstrap = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await requireUser(ctx);
    if (await anyAdmin(ctx)) {
      throw new ConvexError("An administrator already exists for this workspace.");
    }
    if (!user.email || isDemoEmail(user.email)) {
      throw new ConvexError("Verify an email address before claiming admin access.");
    }
    await ctx.db.patch(userId, {
      role: "admin",
      consentAt: user.consentAt ?? Date.now(),
      consentVersion: user.consentVersion ?? "RA10173-v1",
    });
  },
});

export const listUsers = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const search = cleanText(args.search, 120).toLowerCase();
    const users = await ctx.db.query("users").order("desc").take(300);

    const rows = await Promise.all(
      users.map(async (user) => {
        const applicant = await ctx.db
          .query("applicantProfiles")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .unique();
        const employer = await ctx.db
          .query("employerProfiles")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .unique();
        return {
          _id: user._id,
          name: employer?.companyName ?? applicant?.fullName ?? user.name ?? "Unnamed account",
          email: user.email,
          role: user.role ?? "unassigned",
          isFreshGrad: applicant?.isFreshGrad ?? false,
          hasResume: Boolean(applicant?.resumeId),
          photoUrl:
            (await storageUrl(ctx, employer?.logoId)) ??
            (await storageUrl(ctx, applicant?.photoId)),
          createdAt: user._creationTime,
          suspendedAt: user.suspendedAt,
          suspendedReason: user.suspendedReason,
        };
      }),
    );

    return rows.filter((row) => {
      if (!search) return true;
      return (
        row.name.toLowerCase().includes(search) ||
        (row.email ?? "").toLowerCase().includes(search) ||
        row.role.includes(search)
      );
    });
  },
});

export const listJobs = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const search = cleanText(args.search, 120).toLowerCase();
    const jobs = await ctx.db.query("jobs").order("desc").take(300);

    const rows = await Promise.all(
      jobs.map(async (job) => {
        const employer = await ctx.db
          .query("employerProfiles")
          .withIndex("by_user", (q) => q.eq("userId", job.employerId))
          .unique();
        const applications = await ctx.db
          .query("applications")
          .withIndex("by_job", (q) => q.eq("jobId", job._id))
          .collect();
        return {
          _id: job._id,
          title: job.title,
          companyName: employer?.companyName ?? "Company",
          location: job.location,
          employmentType: job.employmentType,
          status: job.status,
          isEntryLevel: job.isEntryLevel,
          createdAt: job.createdAt,
          applicationCount: applications.length,
          requirementCount: job.requirements.length,
        };
      }),
    );

    return rows.filter((row) => {
      if (!search) return true;
      return (
        row.title.toLowerCase().includes(search) ||
        row.companyName.toLowerCase().includes(search) ||
        row.location.toLowerCase().includes(search)
      );
    });
  },
});

export const setUserSuspended = mutation({
  args: {
    userId: v.id("users"),
    suspended: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAdmin(ctx);
    if (args.userId === adminId) {
      throw new ConvexError("You cannot suspend your own administrator account.");
    }
    const target = await ctx.db.get(args.userId);
    if (!target) throw new ConvexError("Account not found.");
    if (target.role === "admin") {
      throw new ConvexError("Administrator accounts cannot be suspended.");
    }
    if (isDemoEmail(target.email)) {
      throw new ConvexError("Demo workspaces cannot be suspended.");
    }
    await ctx.db.patch(args.userId, {
      suspendedAt: args.suspended ? Date.now() : undefined,
      suspendedReason: args.suspended
        ? cleanText(args.reason, 240) || "Policy review"
        : undefined,
    });
  },
});

export const setJobStatus = mutation({
  args: {
    jobId: v.id("jobs"),
    status: v.union(v.literal("open"), v.literal("closed")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new ConvexError("Job not found.");
    await ctx.db.patch(job._id, { status: args.status, updatedAt: Date.now() });
  },
});

export const removeJob = mutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job) return;

    const applications = await ctx.db
      .query("applications")
      .withIndex("by_job", (q) => q.eq("jobId", job._id))
      .collect();
    for (const application of applications) {
      await ctx.db.delete(application._id);
    }

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_job", (q) => q.eq("jobId", job._id))
      .collect();
    for (const conversation of conversations) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .collect();
      for (const message of messages) {
        await ctx.db.delete(message._id);
      }
      await ctx.db.delete(conversation._id);
    }

    await ctx.db.delete(job._id);
  },
});
