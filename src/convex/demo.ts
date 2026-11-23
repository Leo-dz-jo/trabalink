import { createAccount } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { action, internalMutation } from "./_generated/server";
import type {
  ApplicationStatus,
  CertificationStatus,
  JobRequirement,
} from "./schema";
import { DEMO_ACCOUNTS } from "../lib/demo";

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const CONSENT_VERSION = "RA10173-v1";

type EducationSeed = {
  id: string;
  school: string;
  course: string;
  yearGraduated?: number;
  gpa?: number;
  honors?: string;
};

type ExperienceSeed = {
  id: string;
  title: string;
  company: string;
  startYear: number;
  endYear?: number;
  description?: string;
};

type CertificationSeed = {
  id: string;
  name: string;
  issuer?: string;
  status: CertificationStatus;
  date?: string;
};

type ProfileSeed = {
  fullName: string;
  headline: string;
  bio: string;
  location: string;
  phone?: string;
  skills: string[];
  education: EducationSeed[];
  experience: ExperienceSeed[];
  certifications: CertificationSeed[];
  isFreshGrad: boolean;
  github?: string;
  linkedin?: string;
  portfolio?: string;
};

type JobSeed = {
  title: string;
  description: string;
  location: string;
  isRemote: boolean;
  employmentType: string;
  salaryMin: number;
  salaryMax: number;
  isEntryLevel: boolean;
  ageDays: number;
  requirements: JobRequirement[];
};

type MessageSeed = {
  sender: "employer" | "applicant";
  body: string;
  ageMinutes: number;
  read: boolean;
};

async function ensureUser(
  ctx: MutationCtx,
  account: { email: string; name: string },
) {
  const existing = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", account.email))
    .unique();
  if (existing) return existing;

  const id = await ctx.db.insert("users", {
    name: account.name,
    email: account.email,
    isAnonymous: false,
    consentAt: Date.now(),
    consentVersion: CONSENT_VERSION,
  });
  const created = await ctx.db.get(id);
  if (!created) throw new ConvexError("Could not create the demo account.");
  return created;
}

async function ensureApplicantProfile(
  ctx: MutationCtx,
  userId: Doc<"users">["_id"],
  seed: ProfileSeed,
  now: number,
  refresh = false,
) {
  const fields = {
    fullName: seed.fullName,
    headline: seed.headline,
    bio: seed.bio,
    location: seed.location,
    phone: seed.phone,
    skills: seed.skills,
    education: seed.education,
    experience: seed.experience,
    certifications: seed.certifications,
    github: seed.github,
    linkedin: seed.linkedin,
    portfolio: seed.portfolio,
    isFreshGrad: seed.isFreshGrad,
  };
  const existing = await ctx.db
    .query("applicantProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (existing) {
    // The signed-in demo applicant may personalise their own profile, but the
    // supporting sample applicants should always match their seed stories.
    if (refresh) {
      await ctx.db.patch(existing._id, { ...fields, updatedAt: now });
      const refreshed = await ctx.db.get(existing._id);
      if (refreshed) return refreshed;
    }
    return existing;
  }

  const id = await ctx.db.insert("applicantProfiles", {
    userId,
    ...fields,
    updatedAt: now,
  });
  const created = await ctx.db.get(id);
  if (!created) throw new ConvexError("Could not create the demo profile.");
  return created;
}

async function ensureEmployerProfile(
  ctx: MutationCtx,
  userId: Doc<"users">["_id"],
  now: number,
) {
  const existing = await ctx.db
    .query("employerProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (existing) return existing;

  await ctx.db.insert("employerProfiles", {
    userId,
    companyName: DEMO_ACCOUNTS.employer.name,
    industry: "Digital products and services",
    companySize: "11–50 employees",
    description:
      "Northstar Digital is a Metro Manila product studio building practical software for growing Philippine businesses. We hire early-career people for evidence and coach the rest.",
    location: "Makati City, Metro Manila",
    website: "https://northstar.example",
    contactEmail: DEMO_ACCOUNTS.employer.email,
    updatedAt: now,
  });
}

async function ensureJob(
  ctx: MutationCtx,
  employerId: Doc<"users">["_id"],
  seed: JobSeed,
  now: number,
) {
  const jobs = await ctx.db
    .query("jobs")
    .withIndex("by_employer", (q) => q.eq("employerId", employerId))
    .collect();
  const existing = jobs.find((job) => job.title === seed.title);
  if (existing) {
    // Keep the shared demo reliable even if a previous visitor closed a role.
    if (
      existing.status !== "open" ||
      !existing.deadline ||
      existing.deadline < now
    ) {
      await ctx.db.patch(existing._id, {
        status: "open",
        deadline: now + 45 * DAY,
        updatedAt: now,
      });
      const refreshed = await ctx.db.get(existing._id);
      if (refreshed) return refreshed;
    }
    return existing;
  }

  const { ageDays, ...job } = seed;
  const createdAt = now - ageDays * DAY;
  const id = await ctx.db.insert("jobs", {
    ...job,
    employerId,
    status: "open",
    deadline: now + 45 * DAY,
    createdAt,
    updatedAt: createdAt,
  });
  const created = await ctx.db.get(id);
  if (!created) throw new ConvexError("Could not create the demo role.");
  return created;
}

async function ensureSampleApplicant(
  ctx: MutationCtx,
  seed: ProfileSeed & { email: string },
  now: number,
) {
  const user = await ensureUser(ctx, {
    email: seed.email,
    name: seed.fullName,
  });
  await ctx.db.patch(user._id, {
    role: "applicant",
    name: seed.fullName,
    consentAt: user.consentAt ?? now,
    consentVersion: CONSENT_VERSION,
  });
  await ensureApplicantProfile(ctx, user._id, seed, now, true);
  return user;
}

async function ensureApplication(
  ctx: MutationCtx,
  jobId: Doc<"jobs">["_id"],
  applicantId: Doc<"users">["_id"],
  status: ApplicationStatus,
  createdAt: number,
  coverNote?: string,
) {
  const existing = await ctx.db
    .query("applications")
    .withIndex("by_job_applicant", (q) =>
      q.eq("jobId", jobId).eq("applicantId", applicantId),
    )
    .unique();
  if (existing) return existing;

  const id = await ctx.db.insert("applications", {
    jobId,
    applicantId,
    status,
    coverNote,
    createdAt,
    updatedAt: createdAt,
  });
  return await ctx.db.get(id);
}

async function ensureConversation(
  ctx: MutationCtx,
  job: Doc<"jobs">,
  employerId: Doc<"users">["_id"],
  applicantId: Doc<"users">["_id"],
  messages: MessageSeed[],
  now: number,
) {
  const existing = await ctx.db
    .query("conversations")
    .withIndex("by_job_applicant", (q) =>
      q.eq("jobId", job._id).eq("applicantId", applicantId),
    )
    .unique();
  if (existing) return existing;

  const last = messages[messages.length - 1];
  if (!last) return null;
  const lastAt = now - last.ageMinutes * MINUTE;

  const conversationId = await ctx.db.insert("conversations", {
    jobId: job._id,
    employerId,
    applicantId,
    subject: job.title,
    lastMessageAt: lastAt,
    lastMessagePreview: last.body.replace(/\s+/g, " ").slice(0, 140),
    lastSenderId: last.sender === "employer" ? employerId : applicantId,
    createdAt:
      now -
      (Math.max(...messages.map((message) => message.ageMinutes)) + 60) *
        MINUTE,
  });

  for (const message of messages) {
    await ctx.db.insert("messages", {
      conversationId,
      senderId: message.sender === "employer" ? employerId : applicantId,
      body: message.body,
      createdAt: now - message.ageMinutes * MINUTE,
      readAt: message.read
        ? now - Math.max(message.ageMinutes - 5, 0) * MINUTE
        : undefined,
    });
  }

  return await ctx.db.get(conversationId);
}

const WEB_REQUIREMENTS: JobRequirement[] = [
  {
    id: "web-javascript",
    label: "JavaScript fundamentals",
    category: "skill",
    type: "MANDATORY",
    weight: 3,
  },
  {
    id: "web-react",
    label: "React or a comparable component framework",
    category: "skill",
    type: "MANDATORY",
    weight: 3,
  },
  {
    id: "web-git",
    label: "Git and collaborative version control",
    category: "skill",
    type: "MANDATORY",
    weight: 2,
  },
  {
    id: "web-css",
    label: "Responsive HTML and CSS",
    category: "skill",
    type: "PREFERRED",
    weight: 2,
  },
  {
    id: "web-degree",
    label:
      "Degree in Computer Science, Information Technology, or a related field",
    category: "education",
    type: "OBTAINABLE_LATER",
    weight: 2,
    gracePeriodDays: 365,
  },
];

const DATA_REQUIREMENTS: JobRequirement[] = [
  {
    id: "data-sql",
    label: "SQL for querying and cleaning data",
    category: "skill",
    type: "MANDATORY",
    weight: 3,
  },
  {
    id: "data-sheets",
    label: "Excel or Google Sheets for analysis",
    category: "skill",
    type: "MANDATORY",
    weight: 2,
  },
  {
    id: "data-python",
    label: "Python for analysis or automation",
    category: "skill",
    type: "MANDATORY",
    weight: 2,
  },
  {
    id: "data-viz",
    label: "Data visualization and reporting",
    category: "skill",
    type: "PREFERRED",
    weight: 2,
  },
  {
    id: "data-degree",
    label:
      "Degree in Statistics, Mathematics, Computer Science, or a related field",
    category: "education",
    type: "OBTAINABLE_LATER",
    weight: 2,
    gracePeriodDays: 365,
  },
];

const SUPPORT_REQUIREMENTS: JobRequirement[] = [
  {
    id: "support-writing",
    label: "Clear written communication",
    category: "skill",
    type: "MANDATORY",
    weight: 3,
  },
  {
    id: "support-troubleshooting",
    label: "Troubleshooting and root-cause thinking",
    category: "skill",
    type: "MANDATORY",
    weight: 2,
  },
  {
    id: "support-crm",
    label: "Experience with a CRM or support desk",
    category: "skill",
    type: "PREFERRED",
    weight: 2,
  },
  {
    id: "support-english",
    label: "Professional English",
    category: "skill",
    type: "MANDATORY",
    weight: 2,
  },
  {
    id: "support-experience",
    label: "At least one year in customer support",
    category: "experience",
    type: "MANDATORY",
    weight: 3,
    minYears: 1,
  },
];

const JOB_SEEDS: JobSeed[] = [
  {
    title: "Junior Web Developer",
    description:
      "Join a small product team building booking and operations tools for Philippine service businesses. You will ship accessible interfaces, pair with a senior engineer, and learn how requirements turn into working software.\n\nWe review evidence, not keyword density: a portfolio, coursework, or an internship all count. The role is hybrid, with two days a week in Makati and the rest remote.",
    location: "Makati City · Hybrid",
    isRemote: false,
    employmentType: "Full-time",
    salaryMin: 28000,
    salaryMax: 38000,
    isEntryLevel: true,
    ageDays: 7,
    requirements: WEB_REQUIREMENTS,
  },
  {
    title: "Data Analyst (Entry Level)",
    description:
      "Help our client teams turn messy operational data into decisions they can explain. You will write SQL, maintain reporting sheets, and present findings to people who are not analysts.\n\nFresh graduates are welcome. We care about careful thinking and clear communication more than a long work history.",
    location: "Quezon City · On-site",
    isRemote: false,
    employmentType: "Full-time",
    salaryMin: 26000,
    salaryMax: 34000,
    isEntryLevel: true,
    ageDays: 5,
    requirements: DATA_REQUIREMENTS,
  },
  {
    title: "Product Support Associate",
    description:
      "Be the calm, precise voice for customers using our software every day. You will investigate issues, write clear replies, and pass reproducible bugs to engineering.\n\nThis is a remote role open to candidates anywhere in the Philippines, with equipment provided and a fixed weekday schedule.",
    location: "Remote · Philippines",
    isRemote: true,
    employmentType: "Full-time",
    salaryMin: 24000,
    salaryMax: 30000,
    isEntryLevel: true,
    ageDays: 3,
    requirements: SUPPORT_REQUIREMENTS,
  },
];

const MIKA: ProfileSeed = {
  fullName: DEMO_ACCOUNTS.applicant.name,
  headline: "Fresh Computer Science graduate · front-end focus",
  bio: "I build accessible interfaces and care about the small details that make a product feel trustworthy. My internship focused on turning Figma prototypes into responsive React screens, and I am looking for a first role where I can keep learning from senior engineers.",
  location: "Quezon City, Metro Manila",
  phone: "0917 000 0000",
  skills: [
    "JavaScript",
    "TypeScript",
    "React",
    "HTML",
    "CSS",
    "Git",
    "Figma",
    "Communication",
  ],
  education: [
    {
      id: "mika-education",
      school: "University of the Philippines Diliman",
      course: "BS Computer Science",
      yearGraduated: 2025,
      honors: "Cum laude",
    },
  ],
  experience: [
    {
      id: "mika-experience",
      title: "Front-end Intern",
      company: "Campus Innovation Lab",
      startYear: 2024,
      endYear: 2024,
      description:
        "Rebuilt three internal forms in React, improved keyboard navigation, and documented the component patterns the team still uses.",
    },
  ],
  certifications: [
    {
      id: "mika-certification",
      name: "Civil Service Professional",
      issuer: "Civil Service Commission",
      status: "EXAM_SCHEDULED",
      date: "2026-12-06",
    },
  ],
  isFreshGrad: true,
  github: "https://github.com/mika-santos-demo",
  linkedin: "https://www.linkedin.com/in/mika-santos-demo",
  portfolio: "https://mika-santos.example",
};

const JOAQUIN: ProfileSeed & { email: string } = {
  email: "sample.joaquin@trabalink.test",
  fullName: "Joaquin Reyes",
  headline: "Career shifter · front-end and QA",
  bio: "Communication graduate moving into front-end development, with internship experience in manual QA and small interface fixes.",
  location: "Pasig City, Metro Manila",
  skills: ["JavaScript", "React", "Git", "SQL", "Testing"],
  education: [
    {
      id: "joaquin-education",
      school: "Polytechnic University of the Philippines",
      course: "BA Communication",
      yearGraduated: 2023,
    },
  ],
  experience: [
    {
      id: "joaquin-experience",
      title: "QA Intern",
      company: "Bayanihan Software",
      startYear: 2024,
      endYear: 2024,
      description:
        "Wrote regression cases and reproduced defects for a web dashboard.",
    },
  ],
  certifications: [],
  isFreshGrad: false,
};

const BEA: ProfileSeed & { email: string } = {
  email: "sample.bea@trabalink.test",
  fullName: "Bea Villanueva",
  headline: "Statistics graduate · data and reporting",
  bio: "I like making numbers useful: cleaning messy exports, building clear dashboards, and explaining what changed.",
  location: "Los Baños, Laguna",
  skills: ["SQL", "Excel", "Python", "Data Visualization", "Communication"],
  education: [
    {
      id: "bea-education",
      school: "University of the Philippines Los Baños",
      course: "BS Statistics",
      yearGraduated: 2025,
    },
  ],
  experience: [
    {
      id: "bea-experience",
      title: "Data Analyst Intern",
      company: "Laguna AgriData",
      startYear: 2025,
      endYear: 2025,
      description:
        "Maintained weekly yield reports and automated a spreadsheet cleanup.",
    },
  ],
  certifications: [],
  isFreshGrad: true,
};

const RAFAEL: ProfileSeed & { email: string } = {
  email: "sample.rafael@trabalink.test",
  fullName: "Rafael Cruz",
  headline: "Customer support specialist · career shifter",
  bio: "Four years of frontline support across chat and email, with a track record of clear escalations and calm customers.",
  location: "Cebu City, Cebu",
  skills: [
    "Customer Support",
    "CRM",
    "Troubleshooting",
    "English",
    "Communication",
  ],
  education: [
    {
      id: "rafael-education",
      school: "University of San Carlos",
      course: "BA Communication",
      yearGraduated: 2021,
    },
  ],
  experience: [
    {
      id: "rafael-experience",
      title: "Senior Support Associate",
      company: "Isla Consumer Tech",
      startYear: 2021,
      endYear: 2025,
      description:
        "Handled escalated billing and delivery issues, documented fixes, and mentored new associates.",
    },
  ],
  certifications: [],
  isFreshGrad: false,
};

/**
 * Ensure both fixed demo accounts exist. Safe to call repeatedly: an existing
 * password account is verified against the published demo password instead of
 * being duplicated.
 */
export const setup = action({
  args: {},
  handler: async (ctx) => {
    for (const account of Object.values(DEMO_ACCOUNTS)) {
      const result = await createAccount(ctx, {
        provider: "password",
        account: { id: account.email, secret: account.password },
        profile: {
          email: account.email,
          name: account.name,
          emailVerificationTime: Date.now(),
        },
        shouldLinkViaEmail: false,
        shouldLinkViaPhone: false,
      });
      if (!result.user) {
        throw new ConvexError("Could not prepare the demo accounts.");
      }
    }

    // Existing demo credential rows predate email verification. They are
    // published demo addresses, so mark them verified before seed data runs.
    await ctx.runMutation(internal.demo.verifyDemoAccounts, {});
    await ctx.runMutation(internal.demo.seed, {});
  },
});

export const verifyDemoAccounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    for (const account of Object.values(DEMO_ACCOUNTS)) {
      const credential = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", account.email),
        )
        .unique();
      if (credential) {
        await ctx.db.patch(credential._id, { emailVerified: account.email });
      }
      const user = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", account.email))
        .unique();
      if (user) {
        await ctx.db.patch(user._id, {
          emailVerificationTime: user.emailVerificationTime ?? now,
        });
      }
    }
  },
});

/** Seed the shared demo marketplace. Every step is idempotent. */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const applicant = await ensureUser(ctx, DEMO_ACCOUNTS.applicant);
    const employer = await ensureUser(ctx, DEMO_ACCOUNTS.employer);

    await ctx.db.patch(applicant._id, {
      role: "applicant",
      name: MIKA.fullName,
      consentAt: applicant.consentAt ?? now,
      consentVersion: CONSENT_VERSION,
      suspendedAt: undefined,
      suspendedReason: undefined,
    });
    await ctx.db.patch(employer._id, {
      role: "employer",
      name: DEMO_ACCOUNTS.employer.name,
      consentAt: employer.consentAt ?? now,
      consentVersion: CONSENT_VERSION,
      suspendedAt: undefined,
      suspendedReason: undefined,
    });

    await ensureApplicantProfile(ctx, applicant._id, MIKA, now);
    await ensureEmployerProfile(ctx, employer._id, now);

    const jobs: Doc<"jobs">[] = [];
    for (const seed of JOB_SEEDS) {
      jobs.push(await ensureJob(ctx, employer._id, seed, now));
    }
    const [webJob, dataJob, supportJob] = jobs;

    const joaquin = await ensureSampleApplicant(ctx, JOAQUIN, now);
    const bea = await ensureSampleApplicant(ctx, BEA, now);
    const rafael = await ensureSampleApplicant(ctx, RAFAEL, now);

    await ensureApplication(
      ctx,
      webJob._id,
      applicant._id,
      "shortlisted",
      now - 2 * DAY,
      "I applied because the role combines interface work with real client problems. My internship case study is on my profile, and I would be glad to walk through it.",
    );
    await ensureApplication(
      ctx,
      dataJob._id,
      applicant._id,
      "new",
      now - 26 * 60 * MINUTE,
    );
    await ensureApplication(
      ctx,
      webJob._id,
      joaquin._id,
      "new",
      now - 30 * 60 * MINUTE,
    );
    await ensureApplication(
      ctx,
      webJob._id,
      bea._id,
      "new",
      now - 20 * 60 * MINUTE,
    );
    await ensureApplication(
      ctx,
      webJob._id,
      rafael._id,
      "new",
      now - 8 * 60 * MINUTE,
    );
    await ensureApplication(ctx, dataJob._id, bea._id, "new", now - 2 * DAY);
    await ensureApplication(
      ctx,
      supportJob._id,
      rafael._id,
      "new",
      now - 6 * 60 * MINUTE,
    );

    await ensureConversation(
      ctx,
      webJob,
      employer._id,
      applicant._id,
      [
        {
          sender: "employer",
          body: "Hi Mika — your profile came through for the Junior Web Developer role. Your accessibility work caught my eye. Are you available for a short call this week?",
          ageMinutes: 1500,
          read: true,
        },
        {
          sender: "applicant",
          body: "Thank you for reaching out. I am available Thursday afternoon, and I can walk through the Figma case study from my internship.",
          ageMinutes: 1320,
          read: true,
        },
        {
          sender: "employer",
          body: "Thursday at 2:00 PM works. I have marked your application as shortlisted; the call details will follow by email.",
          ageMinutes: 180,
          read: false,
        },
      ],
      now,
    );

    await ensureConversation(
      ctx,
      webJob,
      employer._id,
      joaquin._id,
      [
        {
          sender: "employer",
          body: "Thanks for applying to the Junior Web Developer role, Joaquin. We are reviewing the take-home submissions this week.",
          ageMinutes: 260,
          read: true,
        },
        {
          sender: "applicant",
          body: "Understood. Is the hybrid schedule fixed, or can it flex around an evening class?",
          ageMinutes: 90,
          read: false,
        },
      ],
      now,
    );

    // Network + interview seeds: following the demo company fills the feed,
    // and a booked call gives both interview screens real content.
    const follow = await ctx.db
      .query("employerFollows")
      .withIndex("by_pair", (q) =>
        q.eq("applicantId", applicant._id).eq("employerId", employer._id),
      )
      .unique();
    if (!follow) {
      await ctx.db.insert("employerFollows", {
        applicantId: applicant._id,
        employerId: employer._id,
        createdAt: now - 5 * DAY,
      });
    }

    const webApplication = await ctx.db
      .query("applications")
      .withIndex("by_job_applicant", (q) =>
        q.eq("jobId", webJob._id).eq("applicantId", applicant._id),
      )
      .unique();
    if (webApplication) {
      const existingInterview = await ctx.db
        .query("interviews")
        .withIndex("by_application", (q) =>
          q.eq("applicationId", webApplication._id),
        )
        .first();
      // 14:00 Philippine time (UTC+8) so the demo reads as a 2 PM call.
      const slot = new Date(now);
      slot.setUTCDate(slot.getUTCDate() + 2);
      slot.setUTCHours(6, 0, 0, 0);
      if (existingInterview?.meetingLink === "https://meet.google.com/trabalink-demo") {
        await ctx.db.patch(existingInterview._id, {
          scheduledAt: slot.getTime(),
          updatedAt: now,
        });
      } else if (!existingInterview) {
        await ctx.db.insert("interviews", {
          applicationId: webApplication._id,
          jobId: webJob._id,
          employerId: employer._id,
          applicantId: applicant._id,
          scheduledAt: slot.getTime(),
          durationMinutes: 45,
          mode: "video",
          meetingLink: "https://meet.google.com/trabalink-demo",
          notes:
            "Walk us through your Figma case study and the accessibility work from your internship.",
          status: "scheduled",
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    const existingNotice = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", applicant._id))
      .first();
    if (!existingNotice) {
      await ctx.db.insert("notifications", {
        userId: applicant._id,
        kind: "system",
        title: "Welcome to your Trabajalink feed",
        body: "You follow Northstar Digital, so every new role they post lands here first.",
        href: "/app",
        createdAt: now - 4 * DAY,
      });
    }

    return { ready: true };
  },
});
