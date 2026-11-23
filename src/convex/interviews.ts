import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  assertActive,
  cleanMultiline,
  cleanText,
  requireEmployer,
  requireUser,
  storageUrl,
} from "./lib/access";
import { notify } from "./lib/notify";

const interviewModeValidator = v.union(
  v.literal("onsite"),
  v.literal("video"),
  v.literal("phone"),
);

const interviewStatusValidator = v.union(
  v.literal("scheduled"),
  v.literal("completed"),
  v.literal("cancelled"),
);

const MODE_LABEL: Record<string, string> = {
  onsite: "On-site",
  video: "Video call",
  phone: "Phone call",
};

function formatSlot(value: number) {
  return new Date(value).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function ownedApplication(
  ctx: MutationCtx,
  employerId: Id<"users">,
  applicationId: Id<"applications">,
) {
  const application = await ctx.db.get(applicationId);
  if (!application) throw new ConvexError("Application not found.");
  const job = await ctx.db.get(application.jobId);
  if (!job || job.employerId !== employerId) {
    throw new ConvexError("You can only schedule interviews for your own applicants.");
  }
  return { application, job };
}

/** Employer books an interview slot and the applicant is notified instantly. */
export const schedule = mutation({
  args: {
    applicationId: v.id("applications"),
    scheduledAt: v.number(),
    durationMinutes: v.number(),
    mode: interviewModeValidator,
    location: v.optional(v.string()),
    meetingLink: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireEmployer(ctx);
    assertActive(user);
    const { application, job } = await ownedApplication(ctx, userId, args.applicationId);

    if (args.scheduledAt < Date.now() - 60_000) {
      throw new ConvexError("Choose a date and time in the future.");
    }
    const duration = Math.round(args.durationMinutes);
    if (!Number.isFinite(duration) || duration < 15 || duration > 240) {
      throw new ConvexError("Interviews can run between 15 and 240 minutes.");
    }
    const location = cleanText(args.location, 200) || undefined;
    const meetingLink = cleanText(args.meetingLink, 400) || undefined;
    if (args.mode === "onsite" && !location) {
      throw new ConvexError("Add the interview venue or address.");
    }
    if (args.mode === "video" && !meetingLink) {
      throw new ConvexError("Add the video call link.");
    }
    if (meetingLink && !/^https:\/\//i.test(meetingLink)) {
      throw new ConvexError("Meeting links must start with https://.");
    }

    // Only one live slot per application: rebooking replaces the old one.
    const existing = await ctx.db
      .query("interviews")
      .withIndex("by_application", (q) => q.eq("applicationId", application._id))
      .collect();
    for (const row of existing) {
      if (row.status === "scheduled") {
        await ctx.db.patch(row._id, { status: "cancelled", updatedAt: Date.now() });
      }
    }

    const now = Date.now();
    const interviewId = await ctx.db.insert("interviews", {
      applicationId: application._id,
      jobId: job._id,
      employerId: userId,
      applicantId: application.applicantId,
      scheduledAt: args.scheduledAt,
      durationMinutes: duration,
      mode: args.mode,
      location,
      meetingLink,
      notes: cleanMultiline(args.notes, 1000) || undefined,
      status: "scheduled",
      createdAt: now,
      updatedAt: now,
    });

    const company = await ctx.db
      .query("employerProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    await notify(ctx, {
      userId: application.applicantId,
      kind: "interview",
      title: `Interview scheduled: ${job.title}`,
      body: `${company?.companyName ?? "The hiring team"} booked ${
        MODE_LABEL[args.mode]
      } on ${formatSlot(args.scheduledAt)} (${duration} minutes).`,
      href: "/app/interviews",
      jobId: job._id,
      actorId: userId,
    });

    return { interviewId };
  },
});

export const updateStatus = mutation({
  args: {
    interviewId: v.id("interviews"),
    status: interviewStatusValidator,
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireEmployer(ctx);
    assertActive(user);
    const interview = await ctx.db.get(args.interviewId);
    if (!interview || interview.employerId !== userId) {
      throw new ConvexError("Interview not found.");
    }
    await ctx.db.patch(interview._id, {
      status: args.status,
      updatedAt: Date.now(),
    });
    if (args.status === "cancelled") {
      await notify(ctx, {
        userId: interview.applicantId,
        kind: "interview",
        title: "Interview cancelled",
        body: "The hiring team cancelled your scheduled interview. Check your messages for a new slot.",
        href: "/app/interviews",
        actorId: userId,
      });
    }
  },
});

export const review = mutation({
  args: {
    interviewId: v.id("interviews"),
    rating: v.number(),
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireEmployer(ctx);
    assertActive(user);
    const interview = await ctx.db.get(args.interviewId);
    if (!interview || interview.employerId !== userId) {
      throw new ConvexError("Interview not found.");
    }
    const rating = Math.round(args.rating);
    if (rating < 1 || rating > 5) {
      throw new ConvexError("Pick a rating between 1 and 5.");
    }
    await ctx.db.patch(interview._id, {
      rating,
      feedback: cleanMultiline(args.feedback, 2000) || undefined,
      status: "completed",
      updatedAt: Date.now(),
    });
  },
});

async function applicantCard(ctx: QueryCtx, applicantId: Id<"users">) {
  const profile = await ctx.db
    .query("applicantProfiles")
    .withIndex("by_user", (q) => q.eq("userId", applicantId))
    .unique();
  const user = await ctx.db.get(applicantId);
  return {
    applicantId,
    name: profile?.fullName ?? user?.name ?? "Applicant",
    headline: profile?.headline,
    email: user?.email,
    phone: profile?.phone,
    photoUrl: await storageUrl(ctx, profile?.photoId),
    resumeUrl: await storageUrl(ctx, profile?.resumeId),
  };
}

export const forEmployer = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const rows = await ctx.db
      .query("interviews")
      .withIndex("by_employer", (q) => q.eq("employerId", userId))
      .collect();

    return Promise.all(
      rows
        .sort((a, b) => a.scheduledAt - b.scheduledAt)
        .map(async (row) => {
          const job = await ctx.db.get(row.jobId);
          const applicant = await applicantCard(ctx, row.applicantId);
          const application = await ctx.db.get(row.applicationId);
          return {
            ...row,
            jobTitle: job?.title ?? "Role",
            applicant,
            applicationStatus: application?.status ?? "new",
          };
        }),
    );
  },
});

export const forApplicant = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const rows = await ctx.db
      .query("interviews")
      .withIndex("by_applicant", (q) => q.eq("applicantId", userId))
      .collect();

    return Promise.all(
      rows
        .sort((a, b) => a.scheduledAt - b.scheduledAt)
        .map(async (row) => {
          const job = await ctx.db.get(row.jobId);
          const company = await ctx.db
            .query("employerProfiles")
            .withIndex("by_user", (q) => q.eq("userId", row.employerId))
            .unique();
          return {
            ...row,
            jobTitle: job?.title ?? "Role",
            companyName: company?.companyName ?? "Company",
            companyLogo: await storageUrl(ctx, company?.logoId),
            companyLocation: company?.location,
          };
        }),
    );
  },
});

export const upcomingCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = (await requireUser(ctx)).userId;
    const user = await ctx.db.get(userId);
    if (!user) return 0;
    const rows =
      user.role === "employer"
        ? await ctx.db
            .query("interviews")
            .withIndex("by_employer", (q) => q.eq("employerId", userId))
            .collect()
        : await ctx.db
            .query("interviews")
            .withIndex("by_applicant", (q) => q.eq("applicantId", userId))
            .collect();
    const now = Date.now();
    return rows.filter(
      (row) => row.status === "scheduled" && row.scheduledAt >= now,
    ).length;
  },
});

/** Applicant-facing read of one interview, used by the confirmation card. */
export const mine = query({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const row = await ctx.db.get(args.interviewId);
    if (!row || row.applicantId !== userId) return null;
    const job = await ctx.db.get(row.jobId);
    return { ...row, jobTitle: job?.title ?? "Role" };
  },
});
