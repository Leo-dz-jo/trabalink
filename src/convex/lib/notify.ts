import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export type NotificationKind =
  | "new_job"
  | "application_status"
  | "interview"
  | "follower"
  | "message"
  | "system";

/**
 * Writes one in-app notification. Every caller has already resolved the
 * recipient from server-side state (never from the client), so this helper
 * only persists the row.
 */
export async function notify(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    kind: NotificationKind;
    title: string;
    body: string;
    href?: string;
    actorId?: Id<"users">;
    jobId?: Id<"jobs">;
  },
) {
  await ctx.db.insert("notifications", {
    userId: args.userId,
    kind: args.kind,
    title: args.title.slice(0, 120),
    body: args.body.slice(0, 400),
    href: args.href,
    actorId: args.actorId,
    jobId: args.jobId,
    createdAt: Date.now(),
  });
}
