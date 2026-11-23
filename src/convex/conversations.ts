import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  assertActive,
  cleanMultiline,
  requireUser,
  storageUrl,
} from "./lib/access";

async function participantName(ctx: QueryCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  const employer = await ctx.db
    .query("employerProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  const applicant = await ctx.db
    .query("applicantProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  return {
    name:
      employer?.companyName ??
      applicant?.fullName ??
      user?.name ??
      "Trabalink member",
    email: user?.email,
    photoUrl:
      (await storageUrl(ctx, employer?.logoId)) ??
      (await storageUrl(ctx, applicant?.photoId)),
    headline: applicant?.headline,
  };
}

async function requireConversation(
  ctx: QueryCtx | MutationCtx,
  conversationId: Id<"conversations">,
  userId: Id<"users">,
) {
  const conversation = await ctx.db.get(conversationId);
  if (!conversation) throw new ConvexError("Conversation not found.");
  if (
    conversation.applicantId !== userId &&
    conversation.employerId !== userId
  ) {
    throw new ConvexError("You do not have access to this conversation.");
  }
  return conversation;
}

async function appendMessage(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
  senderId: Id<"users">,
  body: string,
) {
  const now = Date.now();
  await ctx.db.insert("messages", {
    conversationId: conversation._id,
    senderId,
    body,
    createdAt: now,
  });
  await ctx.db.patch(conversation._id, {
    lastMessageAt: now,
    lastMessagePreview: body.slice(0, 160),
    lastSenderId: senderId,
  });
}

/**
 * Opens the thread between an applicant and the employer who owns the job.
 * Applicants can ask a question before applying; employers can only message
 * someone who applied to their own job.
 */
export const start = mutation({
  args: {
    jobId: v.id("jobs"),
    applicantId: v.optional(v.id("users")),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    assertActive(user);
    const body = cleanMultiline(args.body, 2000);
    if (body.length < 2) throw new ConvexError("Write a message before sending.");

    const job = await ctx.db.get(args.jobId);
    if (!job) throw new ConvexError("This job no longer exists.");

    let applicantId: Id<"users">;
    if (user.role === "employer") {
      if (job.employerId !== userId) {
        throw new ConvexError("You can only message applicants to your own jobs.");
      }
      if (!args.applicantId) {
        throw new ConvexError("Choose an applicant to message.");
      }
      applicantId = args.applicantId;
      const application = await ctx.db
        .query("applications")
        .withIndex("by_job_applicant", (q) =>
          q.eq("jobId", job._id).eq("applicantId", applicantId),
        )
        .unique();
      if (!application) {
        throw new ConvexError("You can message applicants who applied to this job.");
      }
    } else if (user.role === "applicant") {
      applicantId = userId;
      const profile = await ctx.db
        .query("applicantProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique();
      if (!profile) {
        throw new ConvexError("Complete your applicant profile before messaging employers.");
      }
    } else {
      throw new ConvexError("Sign in as an applicant or employer to send messages.");
    }

    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_job_applicant", (q) =>
        q.eq("jobId", job._id).eq("applicantId", applicantId),
      )
      .unique();

    if (existing) {
      await appendMessage(ctx, existing, userId, body);
      return existing._id;
    }

    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      jobId: job._id,
      employerId: job.employerId,
      applicantId,
      subject: job.title,
      lastMessageAt: now,
      lastMessagePreview: body.slice(0, 160),
      lastSenderId: userId,
      createdAt: now,
    });
    const conversation = await ctx.db.get(conversationId);
    if (conversation) await appendMessage(ctx, conversation, userId, body);
    return conversationId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const asEmployer = await ctx.db
      .query("conversations")
      .withIndex("by_employer", (q) => q.eq("employerId", userId))
      .collect();
    const asApplicant = await ctx.db
      .query("conversations")
      .withIndex("by_applicant", (q) => q.eq("applicantId", userId))
      .collect();

    const conversations = [...asEmployer, ...asApplicant].sort(
      (a, b) => b.lastMessageAt - a.lastMessageAt,
    );

    return Promise.all(
      conversations.map(async (conversation) => {
        const counterpartId =
          conversation.employerId === userId
            ? conversation.applicantId
            : conversation.employerId;
        const counterpart = await participantName(ctx, counterpartId);
        const job = await ctx.db.get(conversation.jobId);
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conversation._id),
          )
          .collect();
        const unread = messages.filter(
          (message) => message.senderId !== userId && message.readAt === undefined,
        ).length;

        return {
          _id: conversation._id,
          subject: conversation.subject,
          jobId: conversation.jobId,
          jobTitle: job?.title ?? conversation.subject,
          counterpart,
          unread,
          lastMessagePreview: conversation.lastMessagePreview,
          lastMessageAt: conversation.lastMessageAt,
          lastSenderId: conversation.lastSenderId,
          messageCount: messages.length,
        };
      }),
    );
  },
});

export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const conversation = await requireConversation(
      ctx,
      args.conversationId,
      userId,
    );
    const counterpartId =
      conversation.employerId === userId
        ? conversation.applicantId
        : conversation.employerId;
    const counterpart = await participantName(ctx, counterpartId);
    const job = await ctx.db.get(conversation.jobId);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversation._id),
      )
      .collect();

    messages.sort((a, b) => a.createdAt - b.createdAt);

    return {
      _id: conversation._id,
      subject: conversation.subject,
      jobId: conversation.jobId,
      jobTitle: job?.title ?? conversation.subject,
      counterpart,
      role: conversation.employerId === userId ? ("employer" as const) : ("applicant" as const),
      messages: messages.map((message) => ({
        _id: message._id,
        body: message.body,
        createdAt: message.createdAt,
        mine: message.senderId === userId,
        read: message.readAt !== undefined,
      })),
    };
  },
});

export const send = mutation({
  args: { conversationId: v.id("conversations"), body: v.string() },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    assertActive(user);
    const body = cleanMultiline(args.body, 2000);
    if (body.length < 1) throw new ConvexError("Write a message before sending.");
    const conversation = await requireConversation(
      ctx,
      args.conversationId,
      userId,
    );
    await appendMessage(ctx, conversation, userId, body);
  },
});

export const markRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const conversation = await requireConversation(
      ctx,
      args.conversationId,
      userId,
    );
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversation._id),
      )
      .collect();
    const now = Date.now();
    for (const message of messages) {
      if (message.senderId !== userId && message.readAt === undefined) {
        await ctx.db.patch(message._id, { readAt: now });
      }
    }
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    // Used by the app shell, which can briefly outlive a sign-out.
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;
    const asEmployer = await ctx.db
      .query("conversations")
      .withIndex("by_employer", (q) => q.eq("employerId", userId))
      .collect();
    const asApplicant = await ctx.db
      .query("conversations")
      .withIndex("by_applicant", (q) => q.eq("applicantId", userId))
      .collect();

    let unread = 0;
    for (const conversation of [...asEmployer, ...asApplicant]) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .collect();
      unread += messages.filter(
        (message) => message.senderId !== userId && message.readAt === undefined,
      ).length;
    }
    return unread;
  },
});
