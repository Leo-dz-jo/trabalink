import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

export interface Viewer {
  userId: Id<"users">;
  user: Doc<"users">;
}

export async function requireUser(ctx: Ctx): Promise<Viewer> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Please sign in to continue.");
  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError("Your account could not be found.");
  return { userId, user };
}

export async function getApplicantProfile(
  ctx: Ctx,
  userId: Id<"users">,
): Promise<Doc<"applicantProfiles"> | null> {
  return ctx.db
    .query("applicantProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

export async function getEmployerProfile(
  ctx: Ctx,
  userId: Id<"users">,
): Promise<Doc<"employerProfiles"> | null> {
  return ctx.db
    .query("employerProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

export async function requireApplicant(ctx: Ctx) {
  const viewer = await requireUser(ctx);
  const profile = await getApplicantProfile(ctx, viewer.userId);
  if (!profile) {
    throw new ConvexError("Complete your applicant profile first.");
  }
  return { ...viewer, profile };
}

export async function requireAdmin(ctx: Ctx) {
  const viewer = await requireUser(ctx);
  if (viewer.user.role !== "admin") {
    throw new ConvexError("Administrator access is required.");
  }
  return viewer;
}

/** Call inside mutations so suspended accounts cannot change data. */
export function assertActive(user: Doc<"users">) {
  if (user.suspendedAt) {
    throw new ConvexError(
      "This account is suspended. Contact the Trabalink administrator to restore access.",
    );
  }
}

export async function requireEmployer(ctx: Ctx) {
  const viewer = await requireUser(ctx);
  const profile = await getEmployerProfile(ctx, viewer.userId);
  if (!profile) {
    throw new ConvexError("Complete your company profile first.");
  }
  return { ...viewer, profile };
}

/** Trim, collapse whitespace, and cap length so stored text stays sane. */
export function cleanText(value: string | undefined, max = 2000): string {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export function cleanMultiline(value: string | undefined, max = 8000): string {
  if (!value) return "";
  return value.replace(/\r\n/g, "\n").trim().slice(0, max);
}

/** Only https URLs are stored, per the portfolio/link safety rules. */
export function cleanHttpsUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new ConvexError("That link is not a valid URL.");
  }
  if (parsed.protocol !== "https:") {
    throw new ConvexError("Links must start with https://");
  }
  return parsed.toString();
}

export function requireText(value: string | undefined, label: string, max = 200) {
  const cleaned = cleanText(value, max);
  if (!cleaned) throw new ConvexError(`${label} is required.`);
  return cleaned;
}

export function clampNumber(value: number | undefined, min: number, max: number) {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, value));
}

export async function storageUrl(
  ctx: Ctx,
  id: Id<"_storage"> | undefined,
): Promise<string | undefined> {
  if (!id) return undefined;
  return (await ctx.storage.getUrl(id)) ?? undefined;
}
