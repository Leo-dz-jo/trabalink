import { describe, expect, test } from "bun:test";
import {
  scoreApplication,
  type ApplicantSnapshot,
  type ScoringRequirement,
} from "./scoring";

const now = "2026-03-01T00:00:00.000Z";

function applicant(overrides: Partial<ApplicantSnapshot> = {}): ApplicantSnapshot {
  return {
    skills: ["React", "TypeScript", "SQL"],
    education: [
      {
        school: "University of the Philippines",
        course: "BS Information Technology",
        yearGraduated: 2025,
        gpa: 1.5,
        honors: "Cum Laude",
      },
    ],
    experience: [],
    certifications: [],
    isFreshGrad: false,
    ...overrides,
  };
}

function req(overrides: Partial<ScoringRequirement>): ScoringRequirement {
  return {
    id: "req-1",
    label: "Requirement",
    category: "skill",
    type: "MANDATORY",
    weight: 40,
    ...overrides,
  };
}

describe("qualification engine", () => {
  test("missing license that is obtainable later becomes conditionally qualified with a deadline", () => {
    const requirements = [
      req({
        id: "portfolio",
        label: "React portfolio",
        category: "skill",
        matchValue: "React",
        weight: 40,
      }),
      req({
        id: "license",
        label: "Licensed Electronics Engineer (PRC)",
        category: "certification",
        type: "OBTAINABLE_LATER",
        matchValue: "Electronics Engineer",
        weight: 60,
        gracePeriodDays: 90,
      }),
    ];

    const result = scoreApplication({
      job: { isEntryLevel: false, title: "Junior Engineer" },
      requirements,
      applicant: applicant({
        certifications: [
          {
            name: "Electronics Engineer Licensure Exam",
            status: "NONE",
          },
        ],
      }),
      now,
      appliedAt: now,
    });

    expect(result.bucket).toBe("CONDITIONALLY_QUALIFIED");
    expect(result.conditions).toHaveLength(1);
    expect(result.conditions[0].gracePeriodDays).toBe(90);
    expect(result.conditions[0].deadline).toBe("2026-05-30T00:00:00.000Z");
    expect(result.missing.map((item) => item.label)).toContain(
      "Licensed Electronics Engineer (PRC)",
    );
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
  });

  test("scheduled exam earns partial credit and a condition instead of failing", () => {
    const requirements = [
      req({
        id: "license",
        label: "Licensed Electronics Engineer",
        category: "certification",
        type: "OBTAINABLE_LATER",
        matchValue: "Electronics Engineer",
        weight: 60,
        gracePeriodDays: 60,
      }),
      req({
        id: "degree",
        label: "BS Electronics Engineering",
        category: "education",
        type: "MANDATORY",
        matchValue: "Electronics Engineering",
        weight: 40,
      }),
    ];

    const withExam = scoreApplication({
      job: { isEntryLevel: true },
      requirements,
      applicant: applicant({
        education: [{ school: "PUP", course: "BS Electronics Engineering" }],
        certifications: [
          {
            name: "Electronics Engineer Licensure Exam",
            status: "EXAM_SCHEDULED",
            date: "2026-04-15",
          },
        ],
      }),
      now,
    });

    const withoutExam = scoreApplication({
      job: { isEntryLevel: true },
      requirements,
      applicant: applicant({
        education: [{ school: "PUP", course: "BS Electronics Engineering" }],
        certifications: [
          { name: "Electronics Engineer Licensure Exam", status: "NONE" },
        ],
      }),
      now,
    });

    expect(withExam.bucket).toBe("CONDITIONALLY_QUALIFIED");
    expect(withExam.partial.map((item) => item.requirementId)).toContain("license");
    expect(withExam.conditions.some((condition) => condition.detail.includes("exam"))).toBe(
      true,
    );
    expect(withExam.score).toBeGreaterThan(withoutExam.score);
  });

  test("fresh graduate with no experience is scored mainly on education", () => {
    const requirements = [
      req({
        id: "degree",
        label: "BS Information Technology",
        category: "education",
        type: "MANDATORY",
        matchValue: "Information Technology",
        weight: 60,
      }),
      req({
        id: "experience",
        label: "2 years of experience",
        category: "experience",
        type: "PREFERRED",
        minYears: 2,
        weight: 40,
      }),
    ];

    const result = scoreApplication({
      job: { isEntryLevel: true, title: "Junior Developer" },
      requirements,
      applicant: applicant({ isFreshGrad: true, experience: [] }),
      now,
    });

    const experienceRow = result.missing.find((item) => item.requirementId === "experience");

    expect(result.freshGradMode).toBe(true);
    expect(result.bucket).toBe("QUALIFIED");
    expect(experienceRow?.weight).toBeLessThanOrEqual(6);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  test("a mandatory experience requirement cannot disqualify a fresh grad", () => {
    const result = scoreApplication({
      job: { isEntryLevel: true, title: "Junior Developer" },
      requirements: [
        req({
          id: "degree",
          label: "BS Computer Science",
          category: "education",
          matchValue: "Information Technology",
          weight: 60,
        }),
        req({
          id: "experience",
          label: "1 year of professional experience",
          category: "experience",
          type: "MANDATORY",
          minYears: 1,
          weight: 40,
        }),
      ],
      applicant: applicant({ isFreshGrad: true, experience: [] }),
      now,
    });

    expect(result.bucket).toBe("QUALIFIED");
    expect(result.missing.map((item) => item.requirementId)).toContain("experience");
    expect(result.score).toBeGreaterThan(70);
  });

  test("OR-group passes when any alternative is satisfied", () => {
    const requirements = [
      req({
        id: "license",
        label: "PRC license",
        category: "certification",
        type: "MANDATORY",
        matchValue: "Civil Engineer License",
        weight: 45,
        groupId: "credential",
      }),
      req({
        id: "degree",
        label: "BS Civil Engineering",
        category: "education",
        type: "MANDATORY",
        matchValue: "Civil Engineering",
        weight: 55,
        groupId: "credential",
      }),
    ];

    const result = scoreApplication({
      job: { isEntryLevel: false },
      requirements,
      applicant: applicant({
        education: [{ school: "Mapua", course: "BS Civil Engineering" }],
      }),
      now,
    });

    expect(result.bucket).toBe("QUALIFIED");
    expect(result.matched.some((item) => item.groupId === "credential")).toBe(true);
    expect(result.matched[0].alternative).toBe(true);
    expect(result.score).toBe(100);
  });

  test("a failed knockout question disqualifies even when requirements match", () => {
    const requirements = [
      req({
        id: "skill",
        label: "React",
        category: "skill",
        matchValue: "React",
        weight: 50,
      }),
      req({
        id: "authorisation",
        label: "Authorised to work in the Philippines",
        category: "other",
        weight: 50,
        knockoutQuestion: "Are you authorised to work in the Philippines?",
      }),
    ];

    const result = scoreApplication({
      job: { isEntryLevel: false },
      requirements,
      applicant: applicant(),
      knockoutAnswers: { authorisation: "no" },
      now,
    });

    expect(result.knockoutFailed).toBe(true);
    expect(result.bucket).toBe("NOT_QUALIFIED");
    expect(result.score).toBeLessThanOrEqual(49);
    expect(result.conditions.some((condition) => condition.detail.includes("knockout"))).toBe(
      true,
    );
  });

  test("all preferred requirements missing never disqualifies", () => {
    const requirements = [
      req({ id: "one", label: "AWS certification", category: "certification", type: "PREFERRED", weight: 50 }),
      req({ id: "two", label: "Docker", category: "skill", type: "PREFERRED", weight: 50 }),
    ];

    const result = scoreApplication({
      job: { isEntryLevel: false },
      requirements,
      applicant: applicant({ skills: ["React"] }),
      now,
    });

    expect(result.bucket).toBe("QUALIFIED");
    expect(result.missing).toHaveLength(2);
    expect(result.conditions).toHaveLength(0);
    expect(result.score).toBe(0);
  });

  test("unmet mandatory requirement is not qualified", () => {
    const result = scoreApplication({
      job: { isEntryLevel: false },
      requirements: [
        req({ id: "skill", label: "Kubernetes", category: "skill", weight: 100 }),
      ],
      applicant: applicant(),
      now,
    });

    expect(result.bucket).toBe("NOT_QUALIFIED");
    expect(result.missing[0].explanation).toContain("Kubernetes");
  });
});
