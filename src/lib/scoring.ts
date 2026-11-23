/**
 * Trabalink qualification engine.
 *
 * Pure, side-effect free and deterministic: the same inputs always produce the
 * same score. No React, no Convex, no dates read from the environment unless a
 * caller passes one. This module is imported by the frontend (match previews)
 * and by Convex queries (employer review), so it must stay dependency free.
 */

export type RequirementCategory =
  | "skill"
  | "experience"
  | "education"
  | "certification"
  | "other";

export type RequirementType = "MANDATORY" | "OBTAINABLE_LATER" | "PREFERRED";

export type QualificationBucket =
  | "QUALIFIED"
  | "CONDITIONALLY_QUALIFIED"
  | "NOT_QUALIFIED";

export type RequirementStatus = "matched" | "partial" | "missing";

export interface ScoringRequirement {
  id: string;
  label: string;
  category: RequirementCategory;
  type: RequirementType;
  weight: number;
  gracePeriodDays?: number;
  groupId?: string;
  knockoutQuestion?: string;
  matchValue?: string;
  minYears?: number;
}

export type CertificationStatus =
  | "HAVE"
  | "EXAM_SCHEDULED"
  | "IN_PROGRESS"
  | "NONE";

export interface ApplicantSnapshot {
  skills: string[];
  education: Array<{
    school: string;
    course: string;
    yearGraduated?: number;
    gpa?: number;
    honors?: string;
  }>;
  experience: Array<{
    title: string;
    company: string;
    startYear: number;
    endYear?: number;
    description?: string;
  }>;
  certifications: Array<{
    name: string;
    issuer?: string;
    status: CertificationStatus;
    date?: string;
    expiry?: string;
  }>;
  isFreshGrad: boolean;
}

export interface ScoringJob {
  title?: string;
  isEntryLevel: boolean;
}

export interface ScoreInput {
  job: ScoringJob;
  requirements: ScoringRequirement[];
  applicant: ApplicantSnapshot;
  /** Yes/no answers keyed by requirement id, from the application form. */
  knockoutAnswers?: Record<string, string>;
  /** ISO date used for grace-period maths. Callers pass this in. */
  now?: string;
  /** ISO date the application was submitted. Defaults to `now`. */
  appliedAt?: string;
}

export interface RequirementBreakdown {
  requirementId: string;
  label: string;
  category: RequirementCategory;
  type: RequirementType;
  status: RequirementStatus;
  weight: number;
  earned: number;
  explanation: string;
  groupId?: string;
  alternative?: boolean;
}

export interface QualificationCondition {
  requirementId: string;
  label: string;
  detail: string;
  gracePeriodDays?: number;
  deadline?: string;
}

export interface QualificationResult {
  score: number;
  bucket: QualificationBucket;
  freshGradMode: boolean;
  matched: RequirementBreakdown[];
  partial: RequirementBreakdown[];
  missing: RequirementBreakdown[];
  conditions: QualificationCondition[];
  knockoutFailed: boolean;
  summary: string;
}

// --------------------------------------------------------------- utilities

const WEAK_TOKENS = new Set([
  "and",
  "the",
  "with",
  "for",
  "of",
  "or",
  "a",
  "an",
  "to",
  "in",
  "on",
  "as",
  "at",
  "other",
  "required",
  "preferred",
  "must",
]);

function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#. ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  return normalise(value)
    .split(" ")
    .filter((token) => token.length > 1 && !WEAK_TOKENS.has(token));
}

function tokenOverlap(target: string, candidate: string): boolean {
  const targetTokens = tokens(target);
  const candidateTokens = new Set(tokens(candidate));
  if (targetTokens.length === 0) return normalise(target) === normalise(candidate);
  return targetTokens.some((token) => candidateTokens.has(token));
}

function targetOf(requirement: ScoringRequirement): string {
  return requirement.matchValue?.trim() || requirement.label;
}

function clampWeight(weight: number): number {
  if (!Number.isFinite(weight)) return 0;
  return Math.max(0, Math.min(100, weight));
}

function toIsoDate(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function yearsOfExperience(applicant: ApplicantSnapshot, nowYear?: number): number {
  const fallbackYear = nowYear ?? new Date().getUTCFullYear();
  return applicant.experience.reduce((total, entry) => {
    const start = Number.isFinite(entry.startYear) ? entry.startYear : fallbackYear;
    const end = Number.isFinite(entry.endYear as number)
      ? Number(entry.endYear)
      : fallbackYear;
    return total + Math.max(0, end - start);
  }, 0);
}

// -------------------------------------------------------------- evaluation

interface Evaluation {
  requirement: ScoringRequirement;
  status: RequirementStatus;
  explanation: string;
  condition?: QualificationCondition;
}

function evaluateRequirement(
  requirement: ScoringRequirement,
  applicant: ApplicantSnapshot,
  knockoutAnswers: Record<string, string>,
  nowIso: string,
  freshGradMode: boolean,
): Evaluation {
  const answer = knockoutAnswers[requirement.id]?.toLowerCase();
  if (requirement.knockoutQuestion && answer === "no") {
    return {
      requirement,
      status: "missing",
      explanation: `Knockout answer was "no" for: ${requirement.knockoutQuestion}`,
    };
  }

  if (requirement.category === "other") {
    if (answer === "yes") {
      return {
        requirement,
        status: "matched",
        explanation: "Confirmed by the applicant's answer to the screening question.",
      };
    }
    return {
      requirement,
      status: "partial",
      explanation: "Needs employer review — this cannot be verified automatically.",
      condition: {
        requirementId: requirement.id,
        label: requirement.label,
        detail: "Verify this requirement during human review.",
      },
    };
  }

  if (requirement.category === "skill") {
    const target = targetOf(requirement);
    const hasSkill = applicant.skills.some((skill) => tokenOverlap(target, skill));
    return hasSkill
      ? {
          requirement,
          status: "matched",
          explanation: `Your profile lists a matching skill for "${target}".`,
        }
      : {
          requirement,
          status: "missing",
          explanation: `No skill on your profile matches "${target}".`,
        };
  }

  if (requirement.category === "certification") {
    const target = targetOf(requirement);
    const match = applicant.certifications.find(
      (cert) => tokenOverlap(target, `${cert.name} ${cert.issuer ?? ""}`),
    );
    if (!match || match.status === "NONE") {
      const condition: QualificationCondition | undefined =
        requirement.type === "OBTAINABLE_LATER"
          ? {
              requirementId: requirement.id,
              label: requirement.label,
              detail:
                requirement.gracePeriodDays && requirement.gracePeriodDays > 0
                  ? `This credential can be obtained within ${requirement.gracePeriodDays} days of applying.`
                  : "This credential can be obtained after hiring.",
              gracePeriodDays: requirement.gracePeriodDays,
              deadline:
                requirement.gracePeriodDays && requirement.gracePeriodDays > 0
                  ? addDays(nowIso, requirement.gracePeriodDays)
                  : undefined,
            }
          : undefined;
      return {
        requirement,
        status: "missing",
        explanation: `You do not hold "${target}" yet.`,
        condition,
      };
    }
    if (match.status === "HAVE") {
      return {
        requirement,
        status: "matched",
        explanation: `You hold "${match.name}"${match.date ? ` (since ${match.date})` : ""}.`,
      };
    }
    const partialExplanation =
      match.status === "EXAM_SCHEDULED"
        ? `Exam scheduled${match.date ? ` on ${match.date}` : ""} for "${match.name}" — partial credit.`
        : `"${match.name}" is in progress — partial credit.`;
    return {
      requirement,
      status: "partial",
      explanation: partialExplanation,
      condition:
        requirement.type === "MANDATORY" || requirement.type === "OBTAINABLE_LATER"
          ? {
              requirementId: requirement.id,
              label: requirement.label,
              detail:
                match.status === "EXAM_SCHEDULED"
                  ? `Confirm the license after the exam${match.date ? ` on ${match.date}` : ""}.`
                  : "Confirm the license once it has been issued.",
              gracePeriodDays: requirement.gracePeriodDays,
              deadline:
                match.status === "EXAM_SCHEDULED" && match.date
                  ? toIsoDate(match.date)
                  : undefined,
            }
          : undefined,
    };
  }

  if (requirement.category === "education") {
    const target = targetOf(requirement);
    const match = applicant.education.find((entry) =>
      tokenOverlap(target, `${entry.school} ${entry.course} ${entry.honors ?? ""}`),
    );
    if (match) {
      return {
        requirement,
        status: "matched",
        explanation: `Matched by your ${match.course || "degree"} at ${match.school}.`,
      };
    }
    if (applicant.education.length > 0) {
      return {
        requirement,
        status: "partial",
        explanation: "You have education on file, but not in the exact field asked for.",
        condition: {
          requirementId: requirement.id,
          label: requirement.label,
          detail: "Employer to review if a related field of study is acceptable.",
        },
      };
    }
    return {
      requirement,
      status: "missing",
      explanation: `No education entry matches "${target}".`,
      condition:
        requirement.type === "OBTAINABLE_LATER"
          ? {
              requirementId: requirement.id,
              label: requirement.label,
              detail: "Education requirement can be completed later.",
              gracePeriodDays: requirement.gracePeriodDays,
              deadline: requirement.gracePeriodDays
                ? addDays(nowIso, requirement.gracePeriodDays)
                : undefined,
            }
          : undefined,
    };
  }

  // experience
  const years = yearsOfExperience(applicant);
  const minimum = requirement.minYears ?? 1;
  if (years >= minimum) {
    return {
      requirement,
      status: "matched",
      explanation: `${years} year${years === 1 ? "" : "s"} of experience on file (needs ${minimum}).`,
    };
  }
  if (applicant.experience.length > 0 && !freshGradMode) {
    return {
      requirement,
      status: "partial",
      explanation: `${years} of ${minimum} required year${minimum === 1 ? "" : "s"} of experience.`,
      condition: {
        requirementId: requirement.id,
        label: requirement.label,
        detail: "Employer to review experience gathered outside formal employment.",
      },
    };
  }
  return {
    requirement,
    status: "missing",
    explanation: freshGradMode
      ? "Fresh-graduate mode: experience is not required to qualify."
      : `No experience entry reaches ${minimum} year${minimum === 1 ? "" : "s"}.`,
    condition:
      requirement.type === "OBTAINABLE_LATER"
        ? {
            requirementId: requirement.id,
            label: requirement.label,
            detail: `Build ${minimum} year${minimum === 1 ? "" : "s"} of experience after applying.`,
            gracePeriodDays: requirement.gracePeriodDays,
            deadline: requirement.gracePeriodDays
              ? addDays(nowIso, requirement.gracePeriodDays)
              : undefined,
          }
        : undefined,
  };
}

interface Unit {
  key: string;
  requirements: Evaluation[];
  weight: number;
  status: RequirementStatus;
  groupId?: string;
}

function effectiveWeight(
  requirement: ScoringRequirement,
  freshGradMode: boolean,
): number {
  const base = clampWeight(requirement.weight);
  if (!freshGradMode) return base;
  if (requirement.category === "experience") return base * 0.15;
  if (requirement.category === "education" || requirement.category === "certification") {
    return base * 1.3;
  }
  return base;
}

function statusRank(status: RequirementStatus): number {
  if (status === "matched") return 2;
  if (status === "partial") return 1;
  return 0;
}

function buildUnits(
  evaluations: Evaluation[],
  freshGradMode: boolean,
): Unit[] {
  const units: Unit[] = [];
  const groups = new Map<string, Evaluation[]>();

  for (const evaluation of evaluations) {
    const { groupId } = evaluation.requirement;
    if (!groupId) {
      units.push({
        key: evaluation.requirement.id,
        requirements: [evaluation],
        weight: effectiveWeight(evaluation.requirement, freshGradMode),
        status: evaluation.status,
      });
      continue;
    }
    const bucket = groups.get(groupId) ?? [];
    bucket.push(evaluation);
    groups.set(groupId, bucket);
  }

  for (const [groupId, members] of groups) {
    // OR group: the best alternative defines the status, the heaviest
    // alternative defines the weight. Meeting one alternative is enough.
    const best = members.reduce((winner, candidate) =>
      statusRank(candidate.status) > statusRank(winner.status) ? candidate : winner,
    );
    const weight = Math.max(
      ...members.map((member) => effectiveWeight(member.requirement, freshGradMode)),
    );
    units.push({
      key: groupId,
      requirements: members,
      weight,
      status: best.status,
      groupId,
    });
  }

  return units;
}

// ------------------------------------------------------------------ engine

export function scoreApplication(input: ScoreInput): QualificationResult {
  const nowIso = toIsoDate(input.now ?? new Date().toISOString());
  // Grace periods run from the application date when we have one, so an
  // employer's condition deadline does not shift every time they open the page.
  const graceBaseIso = toIsoDate(input.appliedAt ?? nowIso);
  const freshGradMode = input.job.isEntryLevel || input.applicant.isFreshGrad;
  const knockoutAnswers = input.knockoutAnswers ?? {};

  const evaluations = input.requirements.map((requirement) =>
    evaluateRequirement(
      requirement,
      input.applicant,
      knockoutAnswers,
      graceBaseIso,
      freshGradMode,
    ),
  );

  const units = buildUnits(evaluations, freshGradMode);
  const totalPossible = units.reduce((sum, unit) => sum + unit.weight, 0);
  const earned = units.reduce((sum, unit) => {
    if (unit.status === "matched") return sum + unit.weight;
    if (unit.status === "partial") return sum + unit.weight * 0.5;
    return sum;
  }, 0);

  let rawScore = totalPossible > 0 ? (earned / totalPossible) * 100 : 100;
  rawScore = Math.max(0, Math.min(100, rawScore));

  const knockoutFailed = evaluations.some(
    (evaluation) =>
      Boolean(evaluation.requirement.knockoutQuestion) &&
      knockoutAnswers[evaluation.requirement.id]?.toLowerCase() === "no",
  );

  // In fresh-grad mode an experience requirement must never disqualify: the
  // whole point is to judge candidates on education, credentials, and evidence
  // instead of years on a payroll.
  const blocksInFreshGrad = (unit: Unit) =>
    unit.requirements.some(
      (member) =>
        member.requirement.type === "MANDATORY" &&
        !(freshGradMode && member.requirement.category === "experience"),
    );

  const mandatoryBlocked = units.some(
    (unit) => unit.status === "missing" && blocksInFreshGrad(unit),
  );
  const mandatoryPartial = units.some(
    (unit) => unit.status === "partial" && blocksInFreshGrad(unit),
  );
  const obtainableOutstanding = units.some(
    (unit) =>
      (unit.status === "missing" || unit.status === "partial") &&
      unit.requirements.some(
        (member) => member.requirement.type === "OBTAINABLE_LATER",
      ),
  );

  let bucket: QualificationBucket = "QUALIFIED";
  if (knockoutFailed || mandatoryBlocked) {
    bucket = "NOT_QUALIFIED";
  } else if (mandatoryPartial || obtainableOutstanding) {
    bucket = "CONDITIONALLY_QUALIFIED";
  }

  // Keep the score consistent with the bucket: a disqualified applicant must
  // never outrank a qualified one in the employer's ranked list.
  const score = Math.round(bucket === "NOT_QUALIFIED" ? Math.min(rawScore, 49) : rawScore);

  const breakdown: RequirementBreakdown[] = units.map((unit) => {
    const primary =
      unit.requirements.find((member) => member.status === unit.status) ??
      unit.requirements[0];
    return {
      requirementId: primary.requirement.id,
      label: primary.requirement.label,
      category: primary.requirement.category,
      type: primary.requirement.type,
      status: unit.status,
      weight: Math.round(unit.weight * 10) / 10,
      earned:
        Math.round(
          (unit.status === "matched"
            ? unit.weight
            : unit.status === "partial"
              ? unit.weight * 0.5
              : 0) * 10,
        ) / 10,
      explanation: primary.explanation,
      groupId: unit.groupId,
      alternative: unit.requirements.length > 1,
    };
  });

  const conditions: QualificationCondition[] = [];
  for (const evaluation of evaluations) {
    if (!evaluation.condition) continue;
    if (evaluation.requirement.type === "PREFERRED") continue;
    if (evaluation.status === "matched") continue;
    conditions.push(evaluation.condition);
  }
  for (const evaluation of evaluations) {
    if (evaluation.requirement.knockoutQuestion && knockoutAnswers[evaluation.requirement.id]?.toLowerCase() === "no") {
      conditions.push({
        requirementId: evaluation.requirement.id,
        label: evaluation.requirement.label,
        detail: "Screening answer did not meet the employer's knockout question.",
      });
    }
  }

  const matched = breakdown.filter((item) => item.status === "matched");
  const partial = breakdown.filter((item) => item.status === "partial");
  const missing = breakdown.filter((item) => item.status === "missing");

  const summary =
    bucket === "QUALIFIED"
      ? "Meets every mandatory requirement."
      : bucket === "CONDITIONALLY_QUALIFIED"
        ? `Meets the core requirements with ${conditions.length} condition${
            conditions.length === 1 ? "" : "s"
          } to clear.`
        : knockoutFailed
          ? "Did not pass a knockout screening question."
          : "One or more mandatory requirements are missing.";

  return {
    score,
    bucket,
    freshGradMode,
    matched,
    partial,
    missing,
    conditions,
    knockoutFailed,
    summary,
  };
}

export const BUCKET_LABELS: Record<QualificationBucket, string> = {
  QUALIFIED: "Qualified",
  CONDITIONALLY_QUALIFIED: "Conditionally qualified",
  NOT_QUALIFIED: "Not qualified",
};
