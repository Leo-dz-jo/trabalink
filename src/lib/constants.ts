export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const PH_LOCATIONS = [
  "Metro Manila",
  "Cebu City",
  "Davao City",
  "Iloilo City",
  "Bacolod",
  "Baguio",
  "Cagayan de Oro",
  "Remote (Philippines)",
] as const;

export const REQUIREMENT_CATEGORIES = [
  {
    value: "skill",
    label: "Skill",
    hint: "Matched against the skills list on the applicant's profile.",
    matchLabel: "Skill to match",
    matchPlaceholder: "e.g. React",
  },
  {
    value: "experience",
    label: "Experience",
    hint: "Matched against total years in the applicant's work history.",
    matchLabel: "Experience context",
    matchPlaceholder: "e.g. Web development",
  },
  {
    value: "education",
    label: "Education",
    hint: "Matched against school, course, and honors.",
    matchLabel: "Course or field to match",
    matchPlaceholder: "e.g. Information Technology",
  },
  {
    value: "certification",
    label: "Certification / license",
    hint: "Matched against certifications, including exam-scheduled status.",
    matchLabel: "Credential to match",
    matchPlaceholder: "e.g. Electronics Engineer",
  },
  {
    value: "other",
    label: "Other screening",
    hint: "Shown as a yes/no knockout question and flagged for human review.",
    matchLabel: "What should match",
    matchPlaceholder: "e.g. Work authorisation",
  },
] as const;

export const REQUIREMENT_TYPES = [
  {
    value: "MANDATORY",
    label: "Mandatory",
    hint: "Not met means not qualified.",
  },
  {
    value: "OBTAINABLE_LATER",
    label: "Obtainable later",
    hint: "Can be earned after hiring; adds a condition and deadline.",
  },
  {
    value: "PREFERRED",
    label: "Preferred",
    hint: "Adds score, never disqualifies.",
  },
] as const;

export const COMPANY_SIZES = [
  "1–10 employees",
  "11–50 employees",
  "51–200 employees",
  "201–500 employees",
  "500+ employees",
] as const;

export const INDUSTRIES = [
  "Information Technology",
  "BPO / Shared Services",
  "Banking & Finance",
  "Engineering & Construction",
  "Healthcare",
  "Retail & E-commerce",
  "Education",
  "Government",
  "Manufacturing",
  "Other",
] as const;

export const CATEGORY_LABEL: Record<string, string> = {
  skill: "Skill",
  experience: "Experience",
  education: "Education",
  certification: "Certification",
  other: "Screening",
};

export const REQUIREMENT_TYPE_LABEL: Record<string, string> = {
  MANDATORY: "Mandatory",
  OBTAINABLE_LATER: "Obtainable later",
  PREFERRED: "Preferred",
};

export const STATUS_LABEL: Record<string, string> = {
  new: "New",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  hired: "Hired",
};

export const CERTIFICATION_STATUSES = [
  { value: "HAVE", label: "I have it" },
  { value: "EXAM_SCHEDULED", label: "Exam scheduled" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "NONE", label: "Not yet" },
] as const;

export const CURRENCY = "₱";
