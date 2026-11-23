import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  scoreApplication,
  type ApplicantSnapshot,
  type QualificationResult,
  type ScoringRequirement,
} from "../lib/scoring";

type Link = { label: string; to: string };

type Reply = {
  answer: string;
  highlights: string[];
  links: Link[];
};

const BUCKET_COPY: Record<string, string> = {
  QUALIFIED: "qualified",
  CONDITIONALLY_QUALIFIED: "conditional",
  NOT_QUALIFIED: "not qualified",
};

function snapshotOf(profile: Doc<"applicantProfiles">): ApplicantSnapshot {
  return {
    skills: profile.skills,
    education: profile.education.map((entry) => ({
      school: entry.school,
      course: entry.course,
      yearGraduated: entry.yearGraduated,
      gpa: entry.gpa,
      honors: entry.honors,
    })),
    experience: profile.experience.map((entry) => ({
      title: entry.title,
      company: entry.company,
      startYear: entry.startYear,
      endYear: entry.endYear,
      description: entry.description,
    })),
    certifications: profile.certifications.map((entry) => ({
      name: entry.name,
      issuer: entry.issuer,
      status: entry.status,
      date: entry.date,
      expiry: entry.expiry,
    })),
    isFreshGrad: profile.isFreshGrad,
  };
}

function scoreFor(
  job: Doc<"jobs">,
  profile: Doc<"applicantProfiles">,
  knockoutAnswers?: Record<string, string>,
  appliedAt?: number,
): QualificationResult {
  return scoreApplication({
    job: { title: job.title, isEntryLevel: job.isEntryLevel },
    requirements: job.requirements as ScoringRequirement[],
    applicant: snapshotOf(profile),
    knockoutAnswers,
    appliedAt: appliedAt ? new Date(appliedAt).toISOString() : undefined,
  });
}

function firstName(name: string | undefined): string {
  return (name ?? "there").trim().split(/\s+/)[0] || "there";
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function wants(prompt: string, pattern: RegExp): boolean {
  return pattern.test(prompt);
}

async function unreadFor(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  conversations: Doc<"conversations">[],
): Promise<{ thread: Doc<"conversations">; unread: number }[]> {
  const rows = await Promise.all(
    conversations.map(async (conversation) => {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .collect();
      const unread = messages.filter(
        (message) => message.senderId !== userId && message.readAt === undefined,
      ).length;
      return { thread: conversation, unread };
    }),
  );
  return rows.filter((row) => row.unread > 0);
}

async function employerName(
  ctx: QueryCtx | MutationCtx,
  employerId: Id<"users">,
): Promise<string> {
  const profile = await ctx.db
    .query("employerProfiles")
    .withIndex("by_user", (q) => q.eq("userId", employerId))
    .unique();
  return profile?.companyName ?? "the hiring team";
}

async function applicantReply(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">,
  prompt: string,
): Promise<Reply> {
  const profile = await ctx.db
    .query("applicantProfiles")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .unique();
  const applications = await ctx.db
    .query("applications")
    .withIndex("by_applicant", (q) => q.eq("applicantId", user._id))
    .collect();
  const conversations = await ctx.db
    .query("conversations")
    .withIndex("by_applicant", (q) => q.eq("applicantId", user._id))
    .collect();
  const unread = await unreadFor(ctx, user._id, conversations);
  const openJobs = await ctx.db
    .query("jobs")
    .withIndex("by_status", (q) => q.eq("status", "open"))
    .take(60);

  const scored = profile
    ? await Promise.all(
        openJobs.map(async (job) => {
          const employer = await employerName(ctx, job.employerId);
          const result = scoreFor(job, profile, undefined, Date.now());
          return { job, employer, result };
        }),
      )
    : [];
  scored.sort((a, b) => b.result.score - a.result.score);

  const displayName = firstName(profile?.fullName ?? user.name);

  if (wants(prompt, /(unread|message|repl|inbox)/)) {
    if (unread.length === 0) {
      return {
        answer: `You are all caught up, ${displayName}. There are no unread replies in your private threads right now.`,
        highlights: [
          `${plural(conversations.length, "conversation")} in your inbox`,
          "Employers typically reply within two working days",
        ],
        links: [{ label: "Open messages", to: "/app/messages" }],
      };
    }
    return {
      answer: `You have ${plural(unread.reduce((sum, row) => sum + row.unread, 0), "unread message")} across ${plural(unread.length, "thread")}. The fastest way to stay in the running is a short, specific reply.`,
      highlights: unread.slice(0, 4).map(
        (row) => `${row.thread.subject} · ${row.unread} unread`,
      ),
      links: [{ label: "Open messages", to: "/app/messages" }],
    };
  }

  if (wants(prompt, /(status|application|applied|progress|hearing)/)) {
    if (applications.length === 0) {
      return {
        answer: `You have not applied to a role yet, ${displayName}. I can point you to the strongest open matches first, so you spend effort where your evidence already fits.`,
        highlights: openJobs.length
          ? [`${plural(openJobs.length, "open role")} ready to review`]
          : ["No open roles at the moment"],
        links: [
          { label: "Browse roles", to: "/app/jobs" },
          { label: "Complete profile", to: "/app/profile" },
        ],
      };
    }
    const counts = applications.reduce<Record<string, number>>((acc, app) => {
      acc[app.status] = (acc[app.status] ?? 0) + 1;
      return acc;
    }, {});
    const recent = applications
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 4);
    const detailed = await Promise.all(
      recent.map(async (application) => {
        const job = await ctx.db.get(application.jobId);
        const employer = job ? await employerName(ctx, job.employerId) : "the employer";
        return `${job?.title ?? "Role"} at ${employer} · ${application.status}`;
      }),
    );
    return {
      answer: `You have ${plural(applications.length, "application")}. Right now: ${Object.entries(counts)
        .map(([status, count]) => `${count} ${status}`)
        .join(", ")}. Employers make the final decision, but you can always see the same requirement breakdown they see.`,
      highlights: detailed,
      links: [{ label: "Open application tracker", to: "/app/applications" }],
    };
  }

  if (wants(prompt, /(improve|profile|gap|skill|resume|stand out|evidence)/)) {
    if (!profile) {
      return {
        answer: `Let's build your evidence base first, ${displayName}. Once your profile has skills, education, and a resume, I can compare you against every open role and name the exact gaps.`,
        highlights: [
          "Add at least three skills",
          "Add your education and any OJT or internship",
          "Upload a PDF or DOCX resume",
        ],
        links: [{ label: "Build your profile", to: "/app/profile" }],
      };
    }
    const missing = new Map<string, string>();
    const conditional = new Map<string, string>();
    for (const row of scored.slice(0, 8)) {
      for (const item of row.result.missing) {
        if (!missing.has(item.label)) {
          missing.set(item.label, `${row.job.title} · missing ${item.label.toLowerCase()}`);
        }
      }
      for (const item of row.result.partial) {
        if (!conditional.has(item.label)) {
          conditional.set(item.label, `${row.job.title} · partially meets ${item.label.toLowerCase()}`);
        }
      }
    }
    const highlights: string[] = [];
    if (!profile.resumeId) highlights.push("Upload a resume — the employer review flow expects one");
    if (!profile.headline) highlights.push("Add a headline that names your direction");
    for (const value of missing.values()) {
      if (highlights.length >= 4) break;
      highlights.push(value);
    }
    for (const value of conditional.values()) {
      if (highlights.length >= 5) break;
      highlights.push(value);
    }
    if (highlights.length === 0) {
      highlights.push("Your profile already clear the mandatory requirements in your best-fit roles");
      highlights.push("Add one metric or project outcome to make the evidence stronger");
    }
    return {
      answer: `Your profile is strongest where your skills match the role's mandatory requirements. I would fix evidence gaps rather than rewrite everything: ${plural(missing.size, "mandatory gap")} appear across your top matches.`,
      highlights,
      links: [
        { label: "Improve profile", to: "/app/profile" },
        { label: "Browse roles", to: "/app/jobs" },
      ],
    };
  }

  if (wants(prompt, /(score|scoring|calculate|how does|bucket|qualified)/)) {
    return {
      answer:
        "Every role is scored from its own requirements. Mandatory requirements must be met; preferred ones only trim the score; requirements marked obtainable later become dated conditions rather than automatic rejections. For entry-level roles, experience weight drops sharply and education, honors, OJT, and credentials carry more weight.",
      highlights: [
        "Qualified: every mandatory requirement is met",
        "Conditionally qualified: a dated license, exam, or degree condition is outstanding",
        "Not qualified: at least one mandatory requirement is missing",
        "A human always reviews the result — there are no silent rejections",
      ],
      links: [{ label: "See your matches", to: "/app/jobs" }],
    };
  }

  if (scored.length === 0) {
    return {
      answer: `There are no open roles to compare right now, ${displayName}. Complete your profile so you are ready when a role appears.`,
      highlights: ["Profile completeness helps employers understand your evidence"],
      links: [{ label: "Open profile", to: "/app/profile" }],
    };
  }

  const top = scored.slice(0, 3);
  return {
    answer: `Your strongest current fit is ${top[0].job.title} at ${top[0].employer}, at ${top[0].result.score}/100. I ranked ${plural(scored.length, "open role")} against your profile. The score is a recommendation; you decide where to apply.`,
    highlights: top.map(
      (row) =>
        `${row.job.title} · ${row.result.score}/100 · ${BUCKET_COPY[row.result.bucket] ?? row.result.bucket}${
          row.result.conditions.length ? ` · ${plural(row.result.conditions.length, "condition")}` : ""
        }`,
    ),
    links: [
      { label: "Browse roles", to: "/app/jobs" },
      { label: "Open dashboard", to: "/app" },
    ],
  };
}

async function employerReply(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">,
  prompt: string,
): Promise<Reply> {
  const company = await ctx.db
    .query("employerProfiles")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .unique();
  const jobs = await ctx.db
    .query("jobs")
    .withIndex("by_employer", (q) => q.eq("employerId", user._id))
    .collect();
  const conversations = await ctx.db
    .query("conversations")
    .withIndex("by_employer", (q) => q.eq("employerId", user._id))
    .collect();
  const unread = await unreadFor(ctx, user._id, conversations);
  const displayName = firstName(company?.companyName ?? user.name);

  const pipeline = await Promise.all(
    jobs.map(async (job) => {
      const applications = await ctx.db
        .query("applications")
        .withIndex("by_job", (q) => q.eq("jobId", job._id))
        .collect();
      const rows = await Promise.all(
        applications.map(async (application) => {
          const profile = await ctx.db
            .query("applicantProfiles")
            .withIndex("by_user", (q) => q.eq("userId", application.applicantId))
            .unique();
          if (!profile) return null;
          const result = scoreFor(job, profile, application.knockoutAnswers, application.createdAt);
          return {
            job,
            application,
            profile,
            result,
          };
        }),
      );
      return rows.filter((row): row is NonNullable<typeof row> => row !== null);
    }),
  );
  const rows = pipeline.flat();
  const buckets = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.result.bucket] = (acc[row.result.bucket] ?? 0) + 1;
    return acc;
  }, {});
  const newCount = rows.filter((row) => row.application.status === "new").length;
  const conditions = rows.filter((row) => row.result.conditions.length > 0);
  const ranked = rows.slice().sort((a, b) => b.result.score - a.result.score);

  if (wants(prompt, /(unread|message|reply|inbox)/)) {
    return {
      answer:
        unread.length > 0
          ? `You have ${plural(unread.reduce((sum, row) => sum + row.unread, 0), "unread applicant message")} across ${plural(unread.length, "thread")}. Replying quickly is the simplest way to keep candidates warm.`
          : `You are caught up, ${displayName}. There are no unread applicant messages right now.`,
      highlights: unread
        .slice(0, 4)
        .map((row) => `${row.thread.subject} · ${plural(row.unread, "unread message")}`),
      links: [{ label: "Open inbox", to: "/app/messages" }],
    };
  }

  if (wants(prompt, /(follow|pending|condition|deadline|remind|waiting)/)) {
    if (rows.length === 0) {
      return {
        answer: `${displayName} has no applicants yet. Once a role receives applications, I can surface conditions, pending decisions, and follow-ups here.`,
        highlights: ["Share a role in the catalog to start the pipeline"],
        links: [{ label: "Post a job", to: "/app/employer/jobs/new" }],
      };
    }
    const pending = conditions.length > 0 ? conditions : rows.filter((row) => row.application.status === "new");
    return {
      answer:
        conditions.length > 0
          ? `${plural(conditions.length, "applicant")} ${conditions.length === 1 ? "has" : "have"} a dated condition, such as a license, exam, or degree requirement. These are the follow-ups most likely to slip.`
          : `There are ${plural(newCount, "application")} still waiting for a first decision. I would review the highest-scoring new candidates first.`,
      highlights: pending.slice(0, 5).map(
        (row) =>
          `${row.profile.fullName} · ${row.job.title} · ${
            row.result.conditions[0]?.label ?? row.application.status
          }`,
      ),
      links: [{ label: "Open pipeline", to: "/app/employer/pipeline" }],
    };
  }

  if (wants(prompt, /(job post|requirements|posting|role|listing)/)) {
    if (jobs.length === 0) {
      return {
        answer: `No roles are posted yet, ${displayName}. A focused role with clear mandatory requirements will produce a stronger, more defensible shortlist.`,
        highlights: [
          "State the few things that truly cannot be learned on the job",
          "Use preferred requirements for nice-to-haves",
          "Add one knockout question for non-negotiable facts",
        ],
        links: [{ label: "Create a job post", to: "/app/employer/jobs/new" }],
      };
    }
    return {
      answer: `You have ${plural(jobs.length, "job post")}, ${jobs.filter((job) => job.status === "open").length} open. Together they hold ${plural(rows.length, "application")}. The best posts separate mandatory requirements from things a candidate can learn after hiring.`,
      highlights: jobs
        .slice(0, 5)
        .map(
          (job) =>
            `${job.title} · ${job.status} · ${plural(
              rows.filter((row) => row.job._id === job._id).length,
              "applicant",
            )}`,
        ),
      links: [{ label: "Manage job posts", to: "/app/employer/jobs" }],
    };
  }

  if (rows.length === 0) {
    return {
      answer: `Your workspace is ready, ${displayName}. There are ${plural(jobs.length, "job post")} and no applications yet. I will explain the pipeline as soon as candidates arrive.`,
      highlights: ["Post a role or share an existing one to begin"],
      links: [
        { label: "Create a job post", to: "/app/employer/jobs/new" },
        { label: "Open dashboard", to: "/app" },
      ],
    };
  }

  return {
    answer: `${displayName} has ${plural(rows.length, "application")} across ${plural(jobs.length, "job post")}. ${buckets.QUALIFIED ?? 0} qualified, ${buckets.CONDITIONALLY_QUALIFIED ?? 0} conditional, and ${buckets.NOT_QUALIFIED ?? 0} not qualified. ${plural(newCount, "application")} still need a first review.`,
    highlights: ranked.slice(0, 4).map(
      (row) =>
        `${row.profile.fullName} · ${row.result.score}/100 · ${BUCKET_COPY[row.result.bucket] ?? row.result.bucket} · ${row.job.title}`,
    ),
    links: [
      { label: "Open pipeline", to: "/app/employer/pipeline" },
      { label: "Open dashboard", to: "/app" },
    ],
  };
}

async function adminReply(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">,
  prompt: string,
): Promise<Reply> {
  const users = await ctx.db.query("users").take(300);
  const jobs = await ctx.db.query("jobs").take(300);
  const suspended = users.filter((account) => account.suspendedAt);
  const demoAccounts = users.filter((account) => account.email?.endsWith("@trabalink.test"));
  const closed = jobs.filter((job) => job.status === "closed");
  const roleCount = users.reduce<Record<string, number>>((acc, account) => {
    const role = account.role ?? "unassigned";
    acc[role] = (acc[role] ?? 0) + 1;
    return acc;
  }, {});

  if (wants(prompt, /(review|first|priority|risk|report|suspend)/)) {
    return {
      answer: `Moderation snapshot: ${plural(suspended.length, "suspended account")}, ${plural(closed.length, "closed job post")}, and ${plural(users.length, "account")} in total. The demo workspaces are protected from suspension.`,
      highlights: [
        ...suspended.slice(0, 4).map(
          (account) => `${account.name ?? account.email ?? "Account"} · suspended${account.suspendedReason ? ` · ${account.suspendedReason}` : ""}`,
        ),
        ...closed.slice(0, 2).map((job) => `${job.title} · closed`),
        `${plural(demoAccounts.length, "demo account")} excluded from moderation actions`,
      ],
      links: [
        { label: "Review accounts", to: "/app/admin/users" },
        { label: "Review job posts", to: "/app/admin/jobs" },
      ],
    };
  }

  return {
    answer: `There are ${plural(users.length, "account")} and ${plural(jobs.length, "job post")} on TRABALINK. ${suspended.length} account${suspended.length === 1 ? " is" : "s are"} suspended and ${closed.length} job post${closed.length === 1 ? " is" : "s are"} closed. Administrator accounts cannot see private messages or resume files.`,
    highlights: Object.entries(roleCount)
      .sort((a, b) => b[1] - a[1])
      .map(([role, count]) => `${role} · ${count}`),
    links: [{ label: "Open moderation console", to: "/app/admin" }],
  };
}

export const ask = query({
  args: { prompt: v.string() },
  handler: async (ctx, args): Promise<Reply> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        answer: "Please sign in so I can read your workspace context.",
        highlights: [],
        links: [],
      };
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return {
        answer: "I could not find your account. Try signing in again.",
        highlights: [],
        links: [],
      };
    }
    const prompt = args.prompt.toLowerCase().slice(0, 600);
    if (user.role === "admin") return adminReply(ctx, user, prompt);
    if (user.role === "employer") return employerReply(ctx, user, prompt);
    if (user.role === "applicant") return applicantReply(ctx, user, prompt);
    return {
      answer: "Finish choosing whether you are applying or hiring, and I will tailor the workspace briefing to your role.",
      highlights: [],
      links: [{ label: "Finish onboarding", to: "/onboarding" }],
    };
  },
});
