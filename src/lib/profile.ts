export interface ApplicantProfileLike {
  fullName?: string;
  headline?: string;
  bio?: string;
  location?: string;
  phone?: string;
  skills?: string[];
  education?: unknown[];
  experience?: unknown[];
  certifications?: unknown[];
  github?: string;
  linkedin?: string;
  portfolio?: string;
  isFreshGrad?: boolean;
  photoUrl?: string;
  resumeUrl?: string;
}

export interface EmployerProfileLike {
  companyName?: string;
  industry?: string;
  companySize?: string;
  description?: string;
  location?: string;
  website?: string;
  contactEmail?: string;
  logoUrl?: string;
}

export interface Completeness {
  percent: number;
  suggestions: string[];
}

export function applicantCompleteness(profile: ApplicantProfileLike | null): Completeness {
  if (!profile) {
    return {
      percent: 0,
      suggestions: ["Tell us about yourself", "Add skills", "Upload your resume"],
    };
  }
  const checks = [
    { label: "Add a professional headline", done: Boolean(profile.headline), weight: 8 },
    { label: "Write a short bio", done: (profile.bio?.length ?? 0) >= 40, weight: 10 },
    { label: "Add your location", done: Boolean(profile.location), weight: 6 },
    { label: "Add at least three skills", done: (profile.skills?.length ?? 0) >= 3, weight: 14 },
    { label: "Add your education", done: (profile.education?.length ?? 0) > 0, weight: 14 },
    {
      label: profile.isFreshGrad
        ? "Add an OJT or internship"
        : "Add work experience",
      done: (profile.experience?.length ?? 0) > 0,
      weight: 10,
    },
    { label: "Upload your resume", done: Boolean(profile.resumeUrl), weight: 20 },
    { label: "Add a profile photo", done: Boolean(profile.photoUrl), weight: 6 },
    {
      label: "Add a certification or license",
      done: (profile.certifications?.length ?? 0) > 0,
      weight: 6,
    },
    {
      label: "Link GitHub or LinkedIn",
      done: Boolean(profile.github || profile.linkedin),
      weight: 6,
    },
  ];

  const total = checks.reduce((sum, check) => sum + check.weight, 0);
  const earned = checks
    .filter((check) => check.done)
    .reduce((sum, check) => sum + check.weight, 0);

  return {
    percent: Math.round((earned / total) * 100),
    suggestions: checks.filter((check) => !check.done).map((check) => check.label),
  };
}

export function employerCompleteness(profile: EmployerProfileLike | null): Completeness {
  if (!profile) {
    return {
      percent: 0,
      suggestions: ["Add your company details", "Describe your team", "Add a logo"],
    };
  }
  const checks = [
    { label: "Add your company name", done: Boolean(profile.companyName), weight: 14 },
    { label: "Pick your industry", done: Boolean(profile.industry), weight: 12 },
    { label: "Set your company size", done: Boolean(profile.companySize), weight: 10 },
    { label: "Write a company description", done: (profile.description?.length ?? 0) >= 60, weight: 20 },
    { label: "Add your office location", done: Boolean(profile.location), weight: 12 },
    { label: "Add a website", done: Boolean(profile.website), weight: 10 },
    { label: "Upload a company logo", done: Boolean(profile.logoUrl), weight: 10 },
    { label: "Add a hiring contact email", done: Boolean(profile.contactEmail), weight: 12 },
  ];
  const total = checks.reduce((sum, check) => sum + check.weight, 0);
  const earned = checks
    .filter((check) => check.done)
    .reduce((sum, check) => sum + check.weight, 0);

  return {
    percent: Math.round((earned / total) * 100),
    suggestions: checks.filter((check) => !check.done).map((check) => check.label),
  };
}
