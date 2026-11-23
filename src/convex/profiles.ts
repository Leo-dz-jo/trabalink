import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  assertActive,
  cleanHttpsUrl,
  cleanMultiline,
  cleanText,
  requireText,
  requireUser,
  storageUrl,
} from "./lib/access";
import { certificationEntryValidator, educationEntryValidator, experienceEntryValidator } from "./schema";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

const resumeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/** Everything the signed-in shell needs, in one reactive subscription. */
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const applicant = await ctx.db
      .query("applicantProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const employer = await ctx.db
      .query("employerProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return {
      user,
      applicant: applicant
        ? {
            ...applicant,
            photoUrl: await storageUrl(ctx, applicant.photoId),
            resumeUrl: await storageUrl(ctx, applicant.resumeId),
          }
        : null,
      employer: employer
        ? { ...employer, logoUrl: await storageUrl(ctx, employer.logoId) }
        : null,
    };
  },
});

export const setRole = mutation({
  args: {
    role: v.union(v.literal("applicant"), v.literal("employer")),
    fullName: v.string(),
    consent: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    assertActive(user);
    const name = cleanText(args.fullName, 120);
    if (!name) throw new ConvexError("Your full name is required.");
    if (!args.consent) {
      throw new ConvexError("Please accept the RA 10173 privacy notice to continue.");
    }
    await ctx.db.patch(userId, {
      role: args.role,
      name,
      consentAt: Date.now(),
      consentVersion: "RA10173-v1",
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    assertActive(user);
    return await ctx.storage.generateUploadUrl();
  },
});

export const upsertApplicantProfile = mutation({
  args: {
    fullName: v.string(),
    headline: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    phone: v.optional(v.string()),
    skills: v.array(v.string()),
    education: v.array(educationEntryValidator),
    experience: v.array(experienceEntryValidator),
    certifications: v.array(certificationEntryValidator),
    github: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    portfolio: v.optional(v.string()),
    isFreshGrad: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    assertActive(user);
    if (user.role === "employer") {
      throw new ConvexError("This account is registered as an employer.");
    }
    const fullName = requireText(args.fullName, "Full name", 120);
    const skills = Array.from(
      new Set(
        args.skills
          .map((skill) => cleanText(skill, 60))
          .filter(Boolean)
          .slice(0, 40),
      ),
    );

    const payload = {
      userId,
      fullName,
      headline: cleanText(args.headline, 140) || undefined,
      bio: cleanMultiline(args.bio, 1500) || undefined,
      location: cleanText(args.location, 120) || undefined,
      phone: cleanText(args.phone, 40) || undefined,
      skills,
      education: args.education.slice(0, 10).map((entry) => ({
        id: entry.id,
        school: requireText(entry.school, "School", 160),
        course: requireText(entry.course, "Course", 160),
        yearGraduated:
          entry.yearGraduated && entry.yearGraduated > 1940
            ? Math.round(entry.yearGraduated)
            : undefined,
        gpa: entry.gpa && entry.gpa > 0 && entry.gpa <= 5 ? entry.gpa : undefined,
        honors: cleanText(entry.honors, 120) || undefined,
      })),
      experience: args.experience.slice(0, 12).map((entry) => ({
        id: entry.id,
        title: requireText(entry.title, "Job title", 120),
        company: requireText(entry.company, "Company", 120),
        startYear: Math.round(entry.startYear),
        endYear:
          entry.endYear && entry.endYear >= entry.startYear
            ? Math.round(entry.endYear)
            : undefined,
        description: cleanMultiline(entry.description, 800) || undefined,
      })),
      certifications: args.certifications.slice(0, 15).map((entry) => ({
        id: entry.id,
        name: requireText(entry.name, "Certification name", 160),
        issuer: cleanText(entry.issuer, 120) || undefined,
        status: entry.status,
        date: cleanText(entry.date, 30) || undefined,
        expiry: cleanText(entry.expiry, 30) || undefined,
      })),
      github: cleanHttpsUrl(args.github),
      linkedin: cleanHttpsUrl(args.linkedin),
      portfolio: cleanHttpsUrl(args.portfolio),
      isFreshGrad: args.isFreshGrad,
      updatedAt: Date.now(),
    };

    const existing = await ctx.db
      .query("applicantProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      await ctx.db.patch(userId, { role: "applicant", name: fullName });
      return existing._id;
    }

    const id = await ctx.db.insert("applicantProfiles", payload);
    await ctx.db.patch(userId, { role: "applicant", name: fullName });
    return id;
  },
});

export const upsertEmployerProfile = mutation({
  args: {
    companyName: v.string(),
    industry: v.optional(v.string()),
    companySize: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    website: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    assertActive(user);
    const companyName = requireText(args.companyName, "Company name", 140);
    if (user.role === "applicant") {
      throw new ConvexError("This account is registered as an applicant.");
    }
    const contactEmail = cleanText(args.contactEmail, 160);
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      throw new ConvexError("Enter a valid contact email.");
    }

    const payload = {
      userId,
      companyName,
      industry: cleanText(args.industry, 120) || undefined,
      companySize: cleanText(args.companySize, 60) || undefined,
      description: cleanMultiline(args.description, 2000) || undefined,
      location: cleanText(args.location, 120) || undefined,
      website: cleanHttpsUrl(args.website),
      contactEmail: contactEmail || user.email,
      updatedAt: Date.now(),
    };

    const existing = await ctx.db
      .query("employerProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      await ctx.db.patch(userId, { role: "employer", name: companyName });
      return existing._id;
    }

    const id = await ctx.db.insert("employerProfiles", payload);
    await ctx.db.patch(userId, { role: "employer", name: companyName });
    return id;
  },
});

async function assertUpload(
  ctx: MutationCtx,
  storageId: Parameters<typeof storageUrl>[1],
  maxBytes: number,
  allowed: (contentType: string) => boolean,
  label: string,
) {
  if (!storageId) throw new ConvexError(`Choose a ${label} to upload.`);
  const meta = await ctx.db.system.get("_storage", storageId);
  if (!meta) throw new ConvexError(`That ${label} could not be found.`);
  if (meta.size !== undefined && meta.size > maxBytes) {
    throw new ConvexError(`${label} must be under ${Math.round(maxBytes / (1024 * 1024))} MB.`);
  }
  if (meta.contentType && !allowed(meta.contentType)) {
    throw new ConvexError(`That ${label} format is not supported.`);
  }
  return meta;
}

export const attachResume = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    assertActive(user);
    const profile = await ctx.db
      .query("applicantProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new ConvexError("Save your profile before uploading a resume.");

    const fileName = cleanText(args.fileName, 160) || "resume.pdf";
    if (!/\.(pdf|docx?)$/i.test(fileName)) {
      throw new ConvexError("Resume must be a PDF or DOCX file.");
    }
    await assertUpload(
      ctx,
      args.storageId,
      MAX_RESUME_BYTES,
      (type) => resumeTypes.has(type),
      "resume",
    );

    if (profile.resumeId && profile.resumeId !== args.storageId) {
      await ctx.storage.delete(profile.resumeId);
    }
    await ctx.db.patch(profile._id, {
      resumeId: args.storageId,
      resumeName: fileName,
      updatedAt: Date.now(),
    });
  },
});

export const removeResume = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await requireUser(ctx);
    assertActive(user);
    const profile = await ctx.db
      .query("applicantProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) return;
    if (profile.resumeId) await ctx.storage.delete(profile.resumeId);
    await ctx.db.patch(profile._id, {
      resumeId: undefined,
      resumeName: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const attachPhoto = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    assertActive(user);
    await assertUpload(
      ctx,
      args.storageId,
      MAX_PHOTO_BYTES,
      (type) => type.startsWith("image/"),
      "photo",
    );

    const applicant = await ctx.db
      .query("applicantProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const employer = await ctx.db
      .query("employerProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (applicant) {
      if (applicant.photoId) await ctx.storage.delete(applicant.photoId);
      await ctx.db.patch(applicant._id, { photoId: args.storageId, updatedAt: Date.now() });
      return await storageUrl(ctx, args.storageId);
    }
    if (employer) {
      if (employer.logoId) await ctx.storage.delete(employer.logoId);
      await ctx.db.patch(employer._id, { logoId: args.storageId, updatedAt: Date.now() });
      return await storageUrl(ctx, args.storageId);
    }
    throw new ConvexError("Create your profile before uploading a photo.");
  },
});
