/**
 * Local copilot engine.
 *
 * Runs entirely in the browser: no API key, no network request, no per-message
 * cost. It is used in three situations:
 *
 *  1. instant intents      — greetings and "what can you do" never need a round trip
 *  2. offline              — the workspace data is unreachable (no connection)
 *  3. degraded             — the workspace request failed or timed out
 *
 * Answers are deliberately honest: when the live workspace cannot be read, the
 * copilot says so instead of inventing numbers.
 */

export type CopilotLink = { label: string; to: string };

export type CopilotReply = {
  answer: string;
  highlights: string[];
  links: CopilotLink[];
};

export type CopilotRole = "applicant" | "employer" | "admin" | string;

export type LocalMode = "offline" | "error";

const HELP = /^(help|what can you do|what do you do|how (do|can) i|capabilities|commands|\?)$/i;

const GREETING = /^(hi|hey|hello|yo|good (morning|afternoon|evening)|kamusta|kumusta)\b/i;

/** Intents answered locally without contacting the workspace. */
export function isLocalIntent(prompt: string): boolean {
  const value = prompt.trim();
  if (!value) return true;
  return HELP.test(value) || GREETING.test(value);
}

const ROLE_PROMPTS: Record<string, string[]> = {
  applicant: [
    "Which open role fits me best?",
    "What should I improve?",
    "Status of my applications",
    "Any unread replies?",
  ],
  employer: [
    "Summarize my pipeline",
    "Who needs a follow-up?",
    "How do my job posts look?",
    "Any unread messages?",
  ],
  admin: [
    "Give me a moderation overview",
    "What should I review first?",
    "How many accounts are suspended?",
  ],
};

const PLAYBOOK: Array<{
  test: RegExp;
  build: (role: string) => CopilotReply;
}> = [
  {
    test: /(score|scoring|bucket|qualified|calculate|weight)/i,
    build: (role) => ({
      answer:
        "Every role is scored from its own requirements. Mandatory requirements must be met, preferred ones only trim the score, and requirements marked obtainable later become dated conditions instead of automatic rejections. Entry-level roles shift weight toward education, honors, OJT, and credentials.",
      highlights: [
        "Qualified — every mandatory requirement is met",
        "Conditionally qualified — a dated license, exam, or degree condition is outstanding",
        "Not qualified — at least one mandatory requirement is missing",
        "A human always reviews the result; there are no silent rejections",
      ],
      links:
        role === "employer"
          ? [
              { label: "Open pipeline", to: "/app/employer/pipeline" },
              { label: "Review a job post", to: "/app/employer/jobs" },
            ]
          : [{ label: "See your matches", to: "/app/jobs" }],
    }),
  },
  {
    test: /(resume|cv|cover letter|summary|bullet)/i,
    build: (role) => ({
      answer:
        "The resume studio works from your profile evidence: it lists what is missing, names the keywords your target roles expect, and drafts a cover letter you can edit. Nothing is generated from a paid model — the review is rule-based and runs in the app.",
      highlights: [
        "One page for under five years of experience, two at most otherwise",
        "Lead each bullet with the action, then the measurable result",
        "Mirror the requirement wording an employer used, only where it is true",
      ],
      links:
        role === "employer"
          ? [{ label: "Company profile", to: "/app/profile" }]
          : [
              { label: "Open resume studio", to: "/app/resume" },
              { label: "Update your profile", to: "/app/profile" },
            ],
    }),
  },
  {
    test: /(interview|schedule|slot|meet|call)/i,
    build: (role) =>
      role === "employer"
        ? {
            answer:
              "Interviews are booked from an applicant's review page: pick a date, a time, and a format, and the applicant is notified with a matching entry on their calendar. You can reschedule or cancel from the Interviews screen, and the candidate always sees the change.",
            highlights: [
              "Book from Pipeline → applicant → Schedule interview",
              "Video and in-person formats carry their own location detail",
              "A scorecard can be attached after the conversation",
            ],
            links: [
              { label: "Open interviews", to: "/app/interviews" },
              { label: "Open pipeline", to: "/app/employer/pipeline" },
            ],
          }
        : {
            answer:
              "When an employer books a slot it appears under Interviews with the date, the local time, and the format. Confirm your availability early, join a few minutes before a video call, and prepare two specific stories that prove the requirements on the post.",
            highlights: [
              "Check the time zone shown on the booking",
              "Prepare one example per mandatory requirement",
              "Have a question ready about the team's first 90 days",
            ],
            links: [{ label: "Open your calendar", to: "/app/interviews" }],
          },
  },
  {
    test: /(follow|message|reply|unread|inbox|email)/i,
    build: (role) => ({
      answer:
        "Messages are grouped per application, so everything about one role stays in a single thread. Reply with something specific — the requirement you meet, a date you are available, a document they asked for. A short, concrete reply moves faster than a long polite one.",
      highlights:
        role === "employer"
          ? [
              "Reply to every shortlisted candidate within two working days",
              "Give a decision date rather than leaving a thread silent",
            ]
          : [
              "Reply within a day when an employer asks for availability",
              "Restate the exact role in the first line of a follow-up",
            ],
      links: [{ label: "Open messages", to: "/app/messages" }],
    }),
  },
  {
    test: /(privacy|security|data|gdpr|private|who can see)/i,
    build: () => ({
      answer:
        "Employers only see the profile you submit with an application. Administrators can moderate accounts and job posts but cannot read private conversations or resume files. Match scores are shown to both sides, and you can remove an uploaded resume at any time from your profile.",
      highlights: [
        "Private threads are visible only to the two participants",
        "Resume files are removable from your profile",
        "Suspension blocks writes but never deletes your records",
      ],
      links: [{ label: "Open profile", to: "/app/profile" }],
    }),
  },
];

function playbookReply(prompt: string, role: string): CopilotReply | undefined {
  for (const entry of PLAYBOOK) {
    if (entry.test.test(prompt)) return entry.build(role);
  }
  return undefined;
}

const ROLE_LINKS: Record<string, CopilotLink[]> = {
  applicant: [
    { label: "Browse roles", to: "/app/jobs" },
    { label: "Your feed", to: "/app" },
  ],
  employer: [
    { label: "Open dashboard", to: "/app" },
    { label: "Open pipeline", to: "/app/employer/pipeline" },
  ],
  admin: [{ label: "Open console", to: "/app/admin" }],
};

function helpReply(role: string, firstName: string): CopilotReply {
  const prompts = ROLE_PROMPTS[role] ?? ROLE_PROMPTS.applicant;
  return {
    answer: `Here is what I can do, ${firstName}. I read your workspace and answer with real figures — matches, gaps, pipeline counts, unread threads, and scheduling. Ask in plain language, or start with one of the suggestions below.`,
    highlights: prompts,
    links: ROLE_LINKS[role] ?? ROLE_LINKS.applicant,
  };
}

/**
 * Build a reply with no network access at all.
 * `mode` explains why the live workspace could not be used.
 */
export function localCopilotReply({
  prompt,
  role,
  firstName,
  mode,
}: {
  prompt: string;
  role: CopilotRole;
  firstName: string;
  mode?: LocalMode;
}): CopilotReply {
  const value = prompt.trim();

  if (!value || HELP.test(value)) return helpReply(role, firstName);

  if (GREETING.test(value)) {
    return {
      answer: `Hello ${firstName}. Ask me about a role, a score, your resume, or your pipeline — I answer from your workspace and never from a paid model.`,
      highlights: (ROLE_PROMPTS[role] ?? ROLE_PROMPTS.applicant).slice(0, 3),
      links: ROLE_LINKS[role] ?? ROLE_LINKS.applicant,
    };
  }

  const known = playbookReply(value, role);
  if (known) {
    if (!mode) return known;
    const note =
      mode === "offline"
        ? "You are offline, so live workspace figures are unavailable — this answer comes from the built-in playbook and still applies."
        : "The workspace did not answer in time, so this comes from the built-in playbook rather than your live data.";
    return {
      ...known,
      answer: `${known.answer}\n\n${note}`,
    };
  }

  const prompts = ROLE_PROMPTS[role] ?? ROLE_PROMPTS.applicant;

  if (mode === "offline") {
    return {
      answer: `I cannot read your workspace while you are offline, ${firstName}. As soon as the connection returns I can rank roles, count your pipeline, and check unread threads again. In the meantime I can still explain scoring, resumes, interviews, messaging, and privacy.`,
      highlights: [
        "Reconnect to get live match scores and pipeline counts",
        ...prompts.slice(0, 2),
      ],
      links: ROLE_LINKS[role] ?? ROLE_LINKS.applicant,
    };
  }

  if (mode === "error") {
    return {
      answer: `I could not reach your workspace just now, ${firstName}. That is usually a dropped connection or a paused server — nothing was changed. Try again in a moment, or ask me something general about scoring, resumes, or interviews; I answer those locally.`,
      highlights: ["Retry the question once the connection settles", ...prompts.slice(0, 2)],
      links: ROLE_LINKS[role] ?? ROLE_LINKS.applicant,
    };
  }

  return {
    answer: `I did not match that to anything specific, ${firstName}. The clearest questions are about a role, your score, a requirement, your resume, an interview, or your messages.`,
    highlights: prompts,
    links: ROLE_LINKS[role] ?? ROLE_LINKS.applicant,
  };
}
