import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireUser } from "./lib/access";

/**
 * Resume studio: a deterministic, explainable assistant over the applicant's
 * own profile. It never invents experience — every suggestion points at data
 * the applicant can add or reword. No external model is called, so the advice
 * stays private, free and reproducible.
 */

type CheckStatus = "pass" | "warn" | "fail";

type Check = {
  id: string;
  title: string;
  status: CheckStatus;
  detail: string;
  fix?: string;
  weight: number;
};

function hasKeyword(haystack: string, needle: string) {
  return haystack.includes(needle.toLowerCase());
}

function normalise(value: string) {
  return value.replace(/[^a-z0-9+#. ]/gi, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function profileText(profile: Doc<"applicantProfiles">) {
  return normalise(
    [
      profile.headline,
      profile.bio,
      profile.skills.join(" "),
      profile.education.map((entry) => `${entry.course} ${entry.school} ${entry.honors ?? ""}`).join(" "),
      profile.experience
        .map((entry) => `${entry.title} ${entry.company} ${entry.description ?? ""}`)
        .join(" "),
      profile.certifications.map((entry) => entry.name).join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function yearsOfExperience(profile: Doc<"applicantProfiles">) {
  const current = new Date().getFullYear();
  return profile.experience.reduce((total, entry) => {
    const end = entry.endYear ?? current;
    return total + Math.max(0, end - entry.startYear);
  }, 0);
}

export const review = query({
  args: { jobId: v.optional(v.id("jobs")) },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const profile = await ctx.db
      .query("applicantProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) {
      return {
        ready: false as const,
        score: 0,
        atsScore: 0,
        headline: "Add your profile to unlock the resume assistant.",
        checks: [] as Check[],
        keywords: null,
        bullets: [] as string[],
        targetRole: null,
      };
    }

    const skillsCount = profile.skills.length;
    const hasLinks = Boolean(profile.github || profile.linkedin || profile.portfolio);
    const experienceYears = yearsOfExperience(profile);
    const describedRoles = profile.experience.filter((entry) => (entry.description ?? "").length >= 60).length;

    const checks: Check[] = [
      {
        id: "resume",
        title: "Resume file attached",
        status: profile.resumeId ? "pass" : "fail",
        detail: profile.resumeId
          ? `${profile.resumeName ?? "Resume"} is on file and attaches to every application.`
          : "Employers cannot download a resume you have not uploaded.",
        fix: profile.resumeId ? undefined : "Upload a PDF or DOCX under 5 MB in your profile.",
        weight: 18,
      },
      {
        id: "headline",
        title: "Targeted headline",
        status: (profile.headline?.length ?? 0) >= 30 ? "pass" : (profile.headline?.length ?? 0) > 0 ? "warn" : "fail",
        detail:
          (profile.headline?.length ?? 0) >= 30
            ? "Your headline names the role you want and the value you bring."
            : "A short or missing headline makes it hard to place you at a glance.",
        fix:
          (profile.headline?.length ?? 0) >= 30
            ? undefined
            : "Use a pattern like “Junior web developer · React + TypeScript · OJT-ready”.",
        weight: 10,
      },
      {
        id: "summary",
        title: "Profile summary",
        status: (profile.bio?.length ?? 0) >= 120 ? "pass" : (profile.bio?.length ?? 0) > 0 ? "warn" : "fail",
        detail:
          (profile.bio?.length ?? 0) >= 120
            ? "Your summary gives employers context beyond a list of skills."
            : "A two-to-three sentence summary improves recruiter scanning.",
        fix:
          (profile.bio?.length ?? 0) >= 120
            ? undefined
            : "Write 2–3 sentences: who you are, your strongest evidence, and the role you want.",
        weight: 8,
      },
      {
        id: "skills",
        title: "Skill coverage",
        status: skillsCount >= 8 ? "pass" : skillsCount >= 4 ? "warn" : "fail",
        detail: `${skillsCount} skill${skillsCount === 1 ? "" : "s"} listed. Match scores are computed against this list.`,
        fix: skillsCount >= 8 ? undefined : "Add the tools and methods you can defend in an interview — aim for 8–12.",
        weight: 14,
      },
      {
        id: "experience",
        title: "Experience narrative",
        status: describedRoles >= 1 ? "pass" : profile.experience.length > 0 ? "warn" : "fail",
        detail:
          profile.experience.length === 0
            ? "No experience or OJT entries yet. Fresh graduates can list OJT, capstone and freelance work."
            : `${profile.experience.length} entr${profile.experience.length === 1 ? "y" : "ies"} · about ${experienceYears} year${experienceYears === 1 ? "" : "s"} of evidence.`,
        fix:
          describedRoles >= 1
            ? undefined
            : "Add one line per entry: what you built, the tools you used, and the measurable result.",
        weight: 16,
      },
      {
        id: "education",
        title: "Education detail",
        status: profile.education.length > 0 ? (profile.education.some((entry) => entry.honors || entry.gpa) ? "pass" : "warn") : "fail",
        detail:
          profile.education.length === 0
            ? "Education is missing, so education requirements cannot be verified."
            : "Add honors or a GPA where it strengthens your case.",
        fix:
          profile.education.length === 0
            ? "Add your school, course and graduation year."
            : profile.education.some((entry) => entry.honors || entry.gpa)
              ? undefined
              : "Include Latin honors, Dean's List, or a GPA above 3.0/4.0 when accurate.",
        weight: 10,
      },
      {
        id: "credentials",
        title: "Certifications & licences",
        status: profile.certifications.length > 0 ? "pass" : "warn",
        detail:
          profile.certifications.length > 0
            ? "Scheduled exams earn partial credit and create a clear condition."
            : "Licensed roles score higher when the credential — or exam date — is listed.",
        fix: profile.certifications.length > 0 ? undefined : "Add one if you have it; otherwise mark the exam as scheduled.",
        weight: 8,
      },
      {
        id: "links",
        title: "Proof links",
        status: hasLinks ? "pass" : "warn",
        detail: hasLinks
          ? "Portfolio, GitHub or LinkedIn gives reviewers a way to verify your work."
          : "A portfolio or GitHub link adds evidence a resume cannot.",
        fix: hasLinks ? undefined : "Add at least one https:// link to work you can show.",
        weight: 8,
      },
      {
        id: "contact",
        title: "Contact readiness",
        status: profile.phone && profile.location ? "pass" : "warn",
        detail:
          profile.phone && profile.location
            ? "Employers can reach you without leaving the workspace."
            : "Missing phone or location slows down interview scheduling.",
        fix: profile.phone && profile.location ? undefined : "Add your mobile number and city.",
        weight: 8,
      },
    ];

    const earned = checks.reduce(
      (total, check) => total + (check.status === "pass" ? check.weight : check.status === "warn" ? check.weight / 2 : 0),
      0,
    );
    const possible = checks.reduce((total, check) => total + check.weight, 0);
    const score = Math.round((earned / possible) * 100);
    const atsScore = Math.round(
      ((checks.filter((check) => check.status !== "fail").length / checks.length) * 55 +
        Math.min(skillsCount, 12) / 12 * 25 +
        Math.min(describedRoles, 3) / 3 * 20) *
        100,
    ) / 100;

    const text = profileText(profile);

    let keywords: { matched: string[]; missing: string[] } | null = null;
    let targetRole: { _id: string; title: string; companyName: string } | null = null;
    const bullets: string[] = [];

    if (args.jobId) {
      const job = await ctx.db.get(args.jobId);
      if (job) {
        const company = await ctx.db
          .query("employerProfiles")
          .withIndex("by_user", (q) => q.eq("userId", job.employerId))
          .unique();
        targetRole = {
          _id: job._id,
          title: job.title,
          companyName: company?.companyName ?? "Company",
        };
        const labels = Array.from(
          new Set(
            job.requirements
              .map((requirement) => requirement.matchValue?.trim() || requirement.label.trim())
              .filter(Boolean),
          ),
        ).slice(0, 12);
        const matched: string[] = [];
        const missing: string[] = [];
        for (const label of labels) {
          if (hasKeyword(text, normalise(label))) matched.push(label);
          else missing.push(label);
        }
        keywords = { matched, missing };

        for (const label of missing.slice(0, 3)) {
          bullets.push(
            `Only claim “${label}” if it is true. If you have it, add it under Skills and mention the project where you used it for ${job.title}.`,
          );
        }
        if (matched.length > 0) {
          bullets.push(
            `Lead your summary with ${matched.slice(0, 3).join(", ")} — these already match what ${company?.companyName ?? "this employer"} screens for.`,
          );
        }
        bullets.push(
          `Mirror the role language: ${labels.slice(0, 4).join(", ") || job.title}. Reviewers scan for these exact terms.`,
        );
      }
    }

    if (profile.experience.length === 0 && profile.education.length > 0) {
      bullets.push(
        `Add your OJT, capstone or org project as an experience entry: what you built, the stack (${profile.skills.slice(0, 3).join(", ") || "tools"}), and the outcome.`,
      );
    }
    if (profile.skills.length > 0) {
      bullets.push(
        `Convert skills into evidence: “Built a ${profile.skills[0]} feature that cut task time by 30%.”`,
      );
    }
    bullets.push(
      "Keep each bullet to one line: action verb + tool + measurable result.",
    );

    const firstFix = checks
      .filter((check) => check.status !== "pass" && check.fix)
      .sort((a, b) => b.weight - a.weight)[0];

    return {
      ready: true as const,
      score,
      atsScore,
      headline:
        score >= 85
          ? "Interview-ready. Tighten the wording and apply while matches are fresh."
          : score >= 65
            ? "Solid base. The gaps below are the fastest wins."
            : "Not review-ready yet. Fix the highest-weight items first.",
      checks,
      keywords,
      bullets: bullets.slice(0, 6),
      targetRole,
      firstFix: firstFix?.fix ?? null,
    };
  },
});

export const coverLetter = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const profile = await ctx.db
      .query("applicantProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) return null;

    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const company = await ctx.db
      .query("employerProfiles")
      .withIndex("by_user", (q) => q.eq("userId", job.employerId))
      .unique();

    const text = profileText(profile);
    const matched = job.requirements
      .map((requirement) => requirement.matchValue?.trim() || requirement.label.trim())
      .filter((label) => label && hasKeyword(text, normalise(label)))
      .slice(0, 4);
    const education = profile.education[0];
    const latestRole = profile.experience[0];
    const name = profile.fullName;
    const companyName = company?.companyName ?? "your team";

    const lines = [
      `Dear Hiring Team at ${companyName},`,
      "",
      `I am applying for the ${job.title} role. ${
        latestRole
          ? `I am currently a ${latestRole.title} at ${latestRole.company}, where I focus on ${profile.skills.slice(0, 3).join(", ") || "delivering measurable results"}.`
          : education
            ? `I recently completed ${education.course} at ${education.school}, and I am ready to contribute from day one.`
            : `I am building my career around ${profile.skills.slice(0, 3).join(", ") || "work I can prove"}.`
      }`,
      "",
      matched.length > 0
        ? `Your posting highlights ${matched.join(", ")}. These are exactly where I have hands-on evidence, and I can walk through the work in detail during an interview.`
        : `I read your requirements closely and would welcome the chance to show how my profile maps to them.`,
      "",
      profile.bio
        ? `${profile.bio.trim()}`
        : `I care about doing the work well and making my contribution easy to verify.`,
      "",
      `I would be glad to discuss how I can help ${companyName}. Thank you for your time and for considering my application.`,
      "",
      "Sincerely,",
      name,
      [user.email, profile.phone, profile.portfolio ?? profile.github ?? profile.linkedin]
        .filter(Boolean)
        .join(" · "),
    ];

    return {
      subject: `Application for ${job.title} — ${name}`,
      body: lines.join("\n"),
      matched,
    };
  },
});
