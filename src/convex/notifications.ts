import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/access";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const limit = Math.min(Math.max(Math.round(args.limit ?? 20), 1), 50);
    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map((row) => ({
        _id: row._id,
        kind: row.kind,
        title: row.title,
        body: row.body,
        href: row.href,
        read: row.readAt !== undefined,
        createdAt: row.createdAt,
      }));
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.filter((row) => row.readAt === undefined).length;
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const row = await ctx.db.get(args.notificationId);
    if (!row || row.userId !== userId) {
      throw new ConvexError("Notification not found.");
    }
    if (row.readAt === undefined) {
      await ctx.db.patch(row._id, { readAt: Date.now() });
    }
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const now = Date.now();
    for (const row of rows) {
      if (row.readAt === undefined) {
        await ctx.db.patch(row._id, { readAt: now });
      }
    }
  },
});
