import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// ---------------------------------------------------------------- roles
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
  APPLICANT: "applicant",
  EMPLOYER: "employer",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
  v.literal(ROLES.APPLICANT),
  v.literal(ROLES.EMPLOYER),
);
export type Role = Infer<typeof roleValidator>;

export const appRoleValidator = v.union(
  v.literal(ROLES.APPLICANT),
  v.literal(ROLES.EMPLOYER),
);
export type AppRole = Infer<typeof appRoleValidator>;

// ---------------------------------------------------------- shared shapes
export const educationEntryValidator = v.object({
  id: v.string(),
  school: v.string(),
  course: v.string(),
  yearGraduated: v.optional(v.number()),
  gpa: v.optional(v.number()),
  honors: v.optional(v.string()),
});

export const experienceEntryValidator = v.object({
  id: v.string(),
  title: v.string(),
  company: v.string(),
  startYear: v.number(),
  endYear: v.optional(v.number()),
  description: v.optional(v.string()),
});

export const certificationStatusValidator = v.union(
  v.literal("HAVE"),
  v.literal("EXAM_SCHEDULED"),
  v.literal("IN_PROGRESS"),
  v.literal("NONE"),
);
export type CertificationStatus = Infer<typeof certificationStatusValidator>;

export const certificationEntryValidator = v.object({
  id: v.string(),
  name: v.string(),
  issuer: v.optional(v.string()),
  status: certificationStatusValidator,
  date: v.optional(v.string()),
  expiry: v.optional(v.string()),
});

export const requirementCategoryValidator = v.union(
  v.literal("skill"),
  v.literal("experience"),
  v.literal("education"),
  v.literal("certification"),
  v.literal("other"),
);
export type RequirementCategory = Infer<typeof requirementCategoryValidator>;

export const requirementTypeValidator = v.union(
  v.literal("MANDATORY"),
  v.literal("OBTAINABLE_LATER"),
  v.literal("PREFERRED"),
);
export type RequirementType = Infer<typeof requirementTypeValidator>;

export const jobRequirementValidator = v.object({
  id: v.string(),
  label: v.string(),
  category: requirementCategoryValidator,
  type: requirementTypeValidator,
  weight: v.number(),
  gracePeriodDays: v.optional(v.number()),
  groupId: v.optional(v.string()),
  knockoutQuestion: v.optional(v.string()),
  matchValue: v.optional(v.string()),
  minYears: v.optional(v.number()),
});
export type JobRequirement = Infer<typeof jobRequirementValidator>;

export const applicationStatusValidator = v.union(
  v.literal("new"),
  v.literal("shortlisted"),
  v.literal("rejected"),
  v.literal("hired"),
);
export type ApplicationStatus = Infer<typeof applicationStatusValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
      consentAt: v.optional(v.number()),
      consentVersion: v.optional(v.string()),
      suspendedAt: v.optional(v.number()),
      suspendedReason: v.optional(v.string()),
    })
      .index("email", ["email"]) // index for the email. do not remove or modify
      .index("by_role", ["role"]),

    applicantProfiles: defineTable({
      userId: v.id("users"),
      fullName: v.string(),
      headline: v.optional(v.string()),
      bio: v.optional(v.string()),
      location: v.optional(v.string()),
      phone: v.optional(v.string()),
      photoId: v.optional(v.id("_storage")),
      resumeId: v.optional(v.id("_storage")),
      resumeName: v.optional(v.string()),
      skills: v.array(v.string()),
      education: v.array(educationEntryValidator),
      experience: v.array(experienceEntryValidator),
      certifications: v.array(certificationEntryValidator),
      github: v.optional(v.string()),
      linkedin: v.optional(v.string()),
      portfolio: v.optional(v.string()),
      isFreshGrad: v.boolean(),
      updatedAt: v.number(),
    }).index("by_user", ["userId"]),

    employerProfiles: defineTable({
      userId: v.id("users"),
      companyName: v.string(),
      industry: v.optional(v.string()),
      companySize: v.optional(v.string()),
      description: v.optional(v.string()),
      location: v.optional(v.string()),
      website: v.optional(v.string()),
      contactEmail: v.optional(v.string()),
      logoId: v.optional(v.id("_storage")),
      updatedAt: v.number(),
    }).index("by_user", ["userId"]),

    jobs: defineTable({
      employerId: v.id("users"),
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
      status: v.union(v.literal("open"), v.literal("closed")),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_employer", ["employerId"])
      .index("by_status", ["status"]),

    applications: defineTable({
      jobId: v.id("jobs"),
      applicantId: v.id("users"),
      coverNote: v.optional(v.string()),
      knockoutAnswers: v.optional(v.record(v.string(), v.string())),
      status: applicationStatusValidator,
      employerNote: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_job", ["jobId"])
      .index("by_applicant", ["applicantId"])
      .index("by_job_applicant", ["jobId", "applicantId"]),

    conversations: defineTable({
      jobId: v.id("jobs"),
      employerId: v.id("users"),
      applicantId: v.id("users"),
      subject: v.string(),
      lastMessageAt: v.number(),
      lastMessagePreview: v.string(),
      lastSenderId: v.id("users"),
      createdAt: v.number(),
    })
      .index("by_employer", ["employerId"])
      .index("by_applicant", ["applicantId"])
      .index("by_job", ["jobId"])
      .index("by_job_applicant", ["jobId", "applicantId"]),

    messages: defineTable({
      conversationId: v.id("conversations"),
      senderId: v.id("users"),
      body: v.string(),
      createdAt: v.number(),
      readAt: v.optional(v.number()),
    }).index("by_conversation", ["conversationId"]),

    // ------------------------------------------------ applicant network
    employerFollows: defineTable({
      applicantId: v.id("users"),
      employerId: v.id("users"),
      createdAt: v.number(),
    })
      .index("by_applicant", ["applicantId"])
      .index("by_employer", ["employerId"])
      .index("by_pair", ["applicantId", "employerId"]),

    savedJobs: defineTable({
      applicantId: v.id("users"),
      jobId: v.id("jobs"),
      createdAt: v.number(),
    })
      .index("by_applicant", ["applicantId"])
      .index("by_pair", ["applicantId", "jobId"]),

    notifications: defineTable({
      userId: v.id("users"),
      kind: v.string(),
      title: v.string(),
      body: v.string(),
      href: v.optional(v.string()),
      actorId: v.optional(v.id("users")),
      jobId: v.optional(v.id("jobs")),
      readAt: v.optional(v.number()),
      createdAt: v.number(),
    }).index("by_user", ["userId"]),

    interviews: defineTable({
      applicationId: v.id("applications"),
      jobId: v.id("jobs"),
      employerId: v.id("users"),
      applicantId: v.id("users"),
      scheduledAt: v.number(),
      durationMinutes: v.number(),
      mode: v.union(
        v.literal("onsite"),
        v.literal("video"),
        v.literal("phone"),
      ),
      location: v.optional(v.string()),
      meetingLink: v.optional(v.string()),
      notes: v.optional(v.string()),
      status: v.union(
        v.literal("scheduled"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
      rating: v.optional(v.number()),
      feedback: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_employer", ["employerId"])
      .index("by_applicant", ["applicantId"])
      .index("by_application", ["applicationId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
