import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { assertActive, cleanText, requireUser, storageUrl } from "./lib/access";
import { notify } from "./lib/notify";

/**
 * Employer network: follow a company, save a role, and read the job feed.
 * All identity is resolved from the session; client-supplied follower ids are
 * never trusted.
 */

type CompanyCard = {
  employerId: Id<"users">;
  name: string;
  industry?: string;
  location?: string;
  description?: string;
  website?: string;
  contactEmail?: string;
  logoUrl?: string;
};

async function companyCard(
  ctx: QueryCtx,
  employerId: Id<"users">,
): Promise<CompanyCard> {
  const profile = await ctx.db
    .query("employerProfiles")
    .withIndex("by_user", (q) => q.eq("userId", employerId))
    .unique();
  const user = await ctx.db.get(employerId);
  return {
    employerId,
    name: profile?.companyName ?? user?.name ?? "Company",
    industry: profile?.industry,
    location: profile?.location,
    description: profile?.description,
    website: profile?.website,
    contactEmail: profile?.contactEmail ?? user?.email,
    logoUrl: await storageUrl(ctx, profile?.logoId),
  };
}

async function followerCount(ctx: QueryCtx, employerId: Id<"users">) {
  const rows = await ctx.db
    .query("employerFollows")
    .withIndex("by_employer", (q) => q.eq("employerId", employerId))
    .collect();
  return rows.length;
}

export const feed = query({
  args: {
    tab: v.optional(
      v.union(v.literal("foryou"), v.literal("following"), v.literal("saved")),
    ),
    search: v.optional(v.string()),
    employmentType: v.optional(v.string()),
    entryLevelOnly: v.optional(v.boolean()),
    remoteOnly: v.optional(v.boolean()),
    employerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const tab = args.tab ?? "foryou";

    const follows =
      user.role === "applicant"
        ? await ctx.db
            .query("employerFollows")
            .withIndex("by_applicant", (q) => q.eq("applicantId", userId))
            .collect()
        : [];
    const followingIds = new Set(follows.map((row) => row.employerId));

    const saves =
      user.role === "applicant"
        ? await ctx.db
            .query("savedJobs")
            .withIndex("by_applicant", (q) => q.eq("applicantId", userId))
            .collect()
        : [];
    const savedIds = new Set(saves.map((row) => row.jobId));

    const applications =
      user.role === "applicant"
        ? await ctx.db
            .query("applications")
            .withIndex("by_applicant", (q) => q.eq("applicantId", userId))
            .collect()
        : [];
    const appliedIds = new Set(applications.map((row) => row.jobId));

    const now = Date.now();
    const search = cleanText(args.search, 120).toLowerCase();
    const openJobs = await ctx.db
      .query("jobs")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    const jobs = openJobs.filter((job) => {
      if (job.deadline && job.deadline < now) return false;
      if (args.employerId && job.employerId !== args.employerId) return false;
      if (tab === "following" && !followingIds.has(job.employerId)) return false;
      if (tab === "saved" && !savedIds.has(job._id)) return false;
      if (args.entryLevelOnly && !job.isEntryLevel) return false;
      if (args.remoteOnly && !job.isRemote) return false;
      if (args.employmentType && job.employmentType !== args.employmentType) {
        return false;
      }
      if (!search) return true;
      const haystack = `${job.title} ${job.description} ${job.location} ${job.requirements
        .map((requirement) => requirement.label)
        .join(" ")}`.toLowerCase();
      return haystack.includes(search);
    });

    const companies = new Map<Id<"users">, CompanyCard>();
    const followerCounts = new Map<Id<"users">, number>();
    const openCounts = new Map<Id<"users">, number>();
    for (const job of openJobs) {
      if (job.deadline && job.deadline < now) continue;
      openCounts.set(job.employerId, (openCounts.get(job.employerId) ?? 0) + 1);
    }
    for (const job of jobs) {
      if (!companies.has(job.employerId)) {
        companies.set(job.employerId, await companyCard(ctx, job.employerId));
        followerCounts.set(
          job.employerId,
          await followerCount(ctx, job.employerId),
        );
      }
    }

    return jobs
      .map((job) => ({
        ...job,
        company: companies.get(job.employerId)!,
        following: followingIds.has(job.employerId),
        saved: savedIds.has(job._id),
        hasApplied: appliedIds.has(job._id),
        followerCount: followerCounts.get(job.employerId) ?? 0,
        employerOpenRoles: openCounts.get(job.employerId) ?? 0,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const companies = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const follows =
      user.role === "applicant"
        ? await ctx.db
            .query("employerFollows")
            .withIndex("by_applicant", (q) => q.eq("applicantId", userId))
            .collect()
        : [];
    const followingIds = new Set(follows.map((row) => row.employerId));

    const now = Date.now();
    const openJobs = await ctx.db
      .query("jobs")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();
    const perEmployer = new Map<Id<"users">, number>();
    for (const job of openJobs) {
      if (job.deadline && job.deadline < now) continue;
      perEmployer.set(job.employerId, (perEmployer.get(job.employerId) ?? 0) + 1);
    }

    const search = cleanText(args.search, 120).toLowerCase();
    const rows = await Promise.all(
      [...perEmployer.entries()].map(async ([employerId, openRoles]) => {
        const company = await companyCard(ctx, employerId);
        return {
          ...company,
          openRoles,
          following: followingIds.has(employerId),
          followerCount: await followerCount(ctx, employerId),
        };
      }),
    );

    return rows
      .filter((row) => {
        if (!search) return true;
        return `${row.name} ${row.industry ?? ""} ${row.location ?? ""}`
          .toLowerCase()
          .includes(search);
      })
      .sort(
        (a, b) =>
          Number(b.following) - Number(a.following) ||
          b.openRoles - a.openRoles ||
          a.name.localeCompare(b.name),
      );
  },
});

/** Hiring teams see who follows them, so the feed is a two-way signal. */
export const followers = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const rows = await ctx.db
      .query("employerFollows")
      .withIndex("by_employer", (q) => q.eq("employerId", userId))
      .collect();
    return Promise.all(
      rows.map(async (row) => {
        const profile = await ctx.db
          .query("applicantProfiles")
          .withIndex("by_user", (q) => q.eq("userId", row.applicantId))
          .unique();
        const user = await ctx.db.get(row.applicantId);
        return {
          applicantId: row.applicantId,
          name: profile?.fullName ?? user?.name ?? "Applicant",
          headline: profile?.headline,
          location: profile?.location,
          skills: profile?.skills.slice(0, 4) ?? [],
          photoUrl: await storageUrl(ctx, profile?.photoId),
          followedAt: row.createdAt,
        };
      }),
    );
  },
});

export const toggleFollow = mutation({
  args: { employerId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    assertActive(user);
    if (user.role !== "applicant") {
      throw new ConvexError("Only applicant accounts can follow employers.");
    }
    if (args.employerId === userId) {
      throw new ConvexError("You cannot follow your own company.");
    }
    const employer = await ctx.db.get(args.employerId);
    const company = await ctx.db
      .query("employerProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.employerId))
      .unique();
    if (!employer || (!company && employer.role !== "employer")) {
      throw new ConvexError("That employer could not be found.");
    }

    const existing = await ctx.db
      .query("employerFollows")
      .withIndex("by_pair", (q) =>
        q.eq("applicantId", userId).eq("employerId", args.employerId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { following: false as const };
    }

    await ctx.db.insert("employerFollows", {
      applicantId: userId,
      employerId: args.employerId,
      createdAt: Date.now(),
    });

    const profile = await ctx.db
      .query("applicantProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    await notify(ctx, {
      userId: args.employerId,
      kind: "follower",
      title: "New company follower",
      body: `${profile?.fullName ?? "An applicant"} is now following ${
        company?.companyName ?? "your company"
      } and will see your new roles first.`,
      href: "/app/employer",
      actorId: userId,
    });

    return { following: true as const };
  },
});

export const toggleSaved = mutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    assertActive(user);
    if (user.role !== "applicant") {
      throw new ConvexError("Only applicant accounts can save roles.");
    }
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new ConvexError("This role no longer exists.");

    const existing = await ctx.db
      .query("savedJobs")
      .withIndex("by_pair", (q) =>
        q.eq("applicantId", userId).eq("jobId", args.jobId),
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false as const };
    }
    await ctx.db.insert("savedJobs", {
      applicantId: userId,
      jobId: args.jobId,
      createdAt: Date.now(),
    });
    return { saved: true as const };
  },
});

export const savedCount = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const rows = await ctx.db
      .query("savedJobs")
      .withIndex("by_applicant", (q) => q.eq("applicantId", userId))
      .collect();
    return rows.length;
  },
});

/** Applicants watching a company are notified the moment a role goes live. */
export async function notifyFollowers(
  ctx: Parameters<typeof notify>[0],
  job: Pick<Doc<"jobs">, "_id" | "employerId" | "title" | "location">,
) {
  const followers = await ctx.db
    .query("employerFollows")
    .withIndex("by_employer", (q) => q.eq("employerId", job.employerId))
    .collect();
  const company = await ctx.db
    .query("employerProfiles")
    .withIndex("by_user", (q) => q.eq("userId", job.employerId))
    .unique();
  for (const follower of followers) {
    await notify(ctx, {
      userId: follower.applicantId,
      kind: "new_job",
      title: `${company?.companyName ?? "A company"} posted ${job.title}`,
      body: `${job.location} · You follow this employer, so this role is in your feed first.`,
      href: `/app/jobs/${job._id}`,
      jobId: job._id,
      actorId: job.employerId,
    });
  }
  return followers.length;
}
