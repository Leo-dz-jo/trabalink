import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { motion } from "framer-motion";
import {
  Award,
  Camera,
  CheckCircle2,
  ExternalLink,
  FileText,
  GraduationCap,
  Link2,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
  UserRound,
  Wrench,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Chip } from "@/components/shared/badges";
import { PageHeader, PageTransition, SectionCard } from "@/components/shared/page";
import { TagInput } from "@/components/shared/tag-input";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useUploader } from "@/hooks/use-upload";
import { useViewer } from "@/hooks/use-viewer";
import { CERTIFICATION_STATUSES, PH_LOCATIONS } from "@/lib/constants";
import { applicantCompleteness } from "@/lib/profile";
import { cn, generateId } from "@/lib/utils";

const SKILL_SUGGESTIONS = [
  "React",
  "TypeScript",
  "JavaScript",
  "Python",
  "SQL",
  "Figma",
  "Java",
  "Node.js",
  "Git",
  "UI/UX Design",
  "Data Analysis",
  "Customer Service",
];

const emptyEducation = () => ({
  id: generateId(),
  school: "",
  course: "",
  yearGraduated: "",
  gpa: "",
  honors: "",
});

const emptyExperience = () => ({
  id: generateId(),
  title: "",
  company: "",
  startYear: "",
  endYear: "",
  description: "",
});

const emptyCertification = () => ({
  id: generateId(),
  name: "",
  issuer: "",
  status: "NONE" as const,
  date: "",
  expiry: "",
});

const yearField = z
  .string()
  .trim()
  .refine((value) => !value || /^(19|20)\d{2}$/.test(value), "Use a 4-digit year");

const schema = z.object({
  fullName: z.string().trim().min(2, "Your full name is required"),
  headline: z.string().trim().max(140, "Keep the headline under 140 characters").optional(),
  bio: z.string().trim().max(1500, "Keep your bio under 1500 characters").optional(),
  location: z.string().trim().max(120).optional(),
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || /^[+0-9()\-\s]{7,20}$/.test(value),
      "Use a valid contact number",
    ),
  skills: z.array(z.string()).min(1, "Add at least one skill"),
  isFreshGrad: z.boolean(),
  github: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^https:\/\/.+\..+/.test(value), "Must start with https://"),
  linkedin: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^https:\/\/.+\..+/.test(value), "Must start with https://"),
  portfolio: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^https:\/\/.+\..+/.test(value), "Must start with https://"),
  education: z.array(
    z.object({
      id: z.string(),
      school: z
        .string()
        .trim()
        .refine((value) => !value || value.length >= 2, "School needs at least 2 characters"),
      course: z
        .string()
        .trim()
        .refine((value) => !value || value.length >= 2, "Course needs at least 2 characters"),
      yearGraduated: yearField,
      gpa: z
        .string()
        .trim()
        .refine(
          (value) => !value || (!Number.isNaN(Number(value)) && Number(value) > 0 && Number(value) <= 5),
          "GPA must be between 0 and 5",
        ),
      honors: z.string().trim().max(120).optional(),
    }),
  ),
  experience: z.array(
    z.object({
      id: z.string(),
      title: z
        .string()
        .trim()
        .refine((value) => !value || value.length >= 2, "Role title needs at least 2 characters"),
      company: z
        .string()
        .trim()
        .refine((value) => !value || value.length >= 2, "Company needs at least 2 characters"),
      startYear: yearField,
      endYear: yearField,
      description: z.string().trim().max(800).optional(),
    }),
  ),
  certifications: z.array(
    z.object({
      id: z.string(),
      name: z
        .string()
        .trim()
        .refine(
          (value) => !value || value.length >= 2,
          "Credential name needs at least 2 characters",
        ),
      issuer: z.string().trim().max(120).optional(),
      status: z.enum(["HAVE", "EXAM_SCHEDULED", "IN_PROGRESS", "NONE"]),
      date: z.string().trim().max(30).optional(),
      expiry: z.string().trim().max(30).optional(),
    }),
  ),
});

type FormValues = z.infer<typeof schema>;

type ApplicantProfileDoc = Doc<"applicantProfiles"> & {
  resumeUrl?: string;
  photoUrl?: string;
};

function formFromProfile(profile: ApplicantProfileDoc): FormValues {
  return {
    fullName: profile.fullName,
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    phone: profile.phone ?? "",
    skills: profile.skills ?? [],
    isFreshGrad: profile.isFreshGrad,
    github: profile.github ?? "",
    linkedin: profile.linkedin ?? "",
    portfolio: profile.portfolio ?? "",
    education:
      profile.education.length > 0
        ? profile.education.map((entry) => ({
            id: entry.id,
            school: entry.school,
            course: entry.course,
            yearGraduated: entry.yearGraduated ? String(entry.yearGraduated) : "",
            gpa: entry.gpa ? String(entry.gpa) : "",
            honors: entry.honors ?? "",
          }))
        : [emptyEducation()],
    experience: profile.experience.map((entry) => ({
      id: entry.id,
      title: entry.title,
      company: entry.company,
      startYear: String(entry.startYear),
      endYear: entry.endYear ? String(entry.endYear) : "",
      description: entry.description ?? "",
    })),
    certifications: profile.certifications.map((entry) => ({
      id: entry.id,
      name: entry.name,
      issuer: entry.issuer ?? "",
      status: entry.status,
      date: entry.date ?? "",
      expiry: entry.expiry ?? "",
    })),
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-unqualified">{message}</p>;
}

export function ApplicantProfilePage() {
  const { applicant } = useViewer();
  const saveProfile = useMutation(api.profiles.upsertApplicantProfile);
  const removeResume = useMutation(api.profiles.removeResume);
  const attachResume = useMutation(api.profiles.attachResume);
  const attachPhoto = useMutation(api.profiles.attachPhoto);
  const { upload } = useUploader();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "1";
  const [saving, setSaving] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const resumeInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const profile = applicant as ApplicantProfileDoc | null;
  const completeness = applicantCompleteness(profile);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      headline: "",
      bio: "",
      location: "",
      phone: "",
      skills: [],
      isFreshGrad: false,
      github: "",
      linkedin: "",
      portfolio: "",
      education: [emptyEducation()],
      experience: [],
      certifications: [],
    },
  });

  const education = useFieldArray({ control: form.control, name: "education" });
  const experience = useFieldArray({ control: form.control, name: "experience" });
  const certifications = useFieldArray({ control: form.control, name: "certifications" });

  useEffect(() => {
    if (!profile) return;
    form.reset(formFromProfile(profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?._id]);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      await saveProfile({
        fullName: values.fullName,
        headline: values.headline,
        bio: values.bio,
        location: values.location,
        phone: values.phone,
        skills: values.skills,
        isFreshGrad: values.isFreshGrad,
        github: values.github,
        linkedin: values.linkedin,
        portfolio: values.portfolio,
        education: values.education
          .filter((entry) => entry.school.trim() && entry.course.trim())
          .map((entry) => ({
            id: entry.id,
            school: entry.school,
            course: entry.course,
            yearGraduated: entry.yearGraduated ? Number(entry.yearGraduated) : undefined,
            gpa: entry.gpa ? Number(entry.gpa) : undefined,
            honors: entry.honors,
          })),
        experience: values.experience
          .filter((entry) => entry.title.trim() && entry.company.trim())
          .map((entry) => ({
            id: entry.id,
            title: entry.title,
            company: entry.company,
            startYear: entry.startYear ? Number(entry.startYear) : new Date().getFullYear(),
            endYear: entry.endYear ? Number(entry.endYear) : undefined,
            description: entry.description,
          })),
        certifications: values.certifications
          .filter((entry) => entry.name.trim())
          .map((entry) => ({
            id: entry.id,
            name: entry.name,
            issuer: entry.issuer,
            status: entry.status,
            date: entry.date,
            expiry: entry.expiry,
          })),
      });
      toast.success("Profile saved. Your match scores are up to date.");
      if (isOnboarding) navigate("/app", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleResume(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Resume must be under 5 MB.");
      return;
    }
    if (!/\.(pdf|docx?)$/i.test(file.name)) {
      toast.error("Upload a PDF or DOCX resume.");
      return;
    }
    if (!profile) {
      toast.error("Save your profile details first, then upload your resume.");
      return;
    }
    setResumeBusy(true);
    try {
      const storageId = await upload(file);
      await attachResume({ storageId, fileName: file.name });
      toast.success("Resume uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Resume upload failed.");
    } finally {
      setResumeBusy(false);
      if (resumeInput.current) resumeInput.current.value = "";
    }
  }

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Photo must be under 3 MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (!profile) {
      toast.error("Save your profile details first, then add a photo.");
      return;
    }
    setPhotoBusy(true);
    try {
      const storageId = await upload(file);
      await attachPhoto({ storageId });
      toast.success("Profile photo updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Photo upload failed.");
    } finally {
      setPhotoBusy(false);
      if (photoInput.current) photoInput.current.value = "";
    }
  }

  return (
    <PageTransition className="space-y-6">
      <PageHeader
        eyebrow={isOnboarding ? "Step 2 of 2" : "Applicant profile"}
        title={
          isOnboarding
            ? "Build the profile employers will read"
            : `Hi ${profile?.fullName?.split(" ")[0] ?? "there"}, let's keep this current.`
        }
        description="Everything here feeds your qualification score. Be specific about skills, credentials, and OJT — those are what employers can verify."
        actions={
          <>
            <div className="hidden items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 card-shadow sm:flex">
              <Sparkles className="size-4 text-primary" />
              <span className="text-xs font-semibold">{completeness.percent}% complete</span>
            </div>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={saving}
              className="h-11 rounded-xl px-5"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <SectionCard
            title="Basics"
            description="How you appear to hiring teams across Trabalink."
            icon={UserRound}
            contentClassName="space-y-5"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <UserAvatar
                  name={form.watch("fullName") || profile?.fullName}
                  src={profile?.photoUrl}
                  className="size-16"
                />
                <button
                  type="button"
                  onClick={() => photoInput.current?.click()}
                  disabled={photoBusy}
                  className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border border-border bg-card text-primary card-shadow transition-colors hover:bg-accent disabled:opacity-50"
                  aria-label="Upload profile photo"
                >
                  {photoBusy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Camera className="size-3.5" />
                  )}
                </button>
                <input
                  ref={photoInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void handlePhoto(event.target.files?.[0])}
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Profile photo</p>
                <p className="text-[11px] text-muted-foreground">
                  JPG, PNG, or WebP · up to 3 MB · optional but recommended
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="fullName" className="text-[13px] font-semibold">
                  Full name *
                </Label>
                <Input
                  id="fullName"
                  className={cn("mt-1.5 h-11 rounded-xl", form.formState.errors.fullName && "border-unqualified")}
                  {...form.register("fullName")}
                />
                <FieldError message={form.formState.errors.fullName?.message} />
              </div>
              <div>
                <Label htmlFor="headline" className="text-[13px] font-semibold">
                  Headline
                </Label>
                <Input
                  id="headline"
                  placeholder="e.g. Frontend developer · fresh grad"
                  className="mt-1.5 h-11 rounded-xl"
                  {...form.register("headline")}
                />
                <FieldError message={form.formState.errors.headline?.message} />
              </div>
              <div>
                <Label htmlFor="location" className="text-[13px] font-semibold">
                  Location
                </Label>
                <Input
                  id="location"
                  list="ph-locations"
                  placeholder="e.g. Quezon City"
                  className="mt-1.5 h-11 rounded-xl"
                  {...form.register("location")}
                />
                <datalist id="ph-locations">
                  {PH_LOCATIONS.map((location) => (
                    <option key={location} value={location} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label htmlFor="phone" className="text-[13px] font-semibold">
                  Contact number
                </Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  placeholder="+63 917 000 0000"
                  className="mt-1.5 h-11 rounded-xl"
                  {...form.register("phone")}
                />
                <FieldError message={form.formState.errors.phone?.message} />
              </div>
            </div>

            <div>
              <Label htmlFor="bio" className="text-[13px] font-semibold">
                Short bio
              </Label>
              <Textarea
                id="bio"
                rows={4}
                placeholder="Two or three sentences on what you build, what you're learning, and what kind of team you want to join."
                className="mt-1.5 rounded-xl"
                {...form.register("bio")}
              />
              <div className="mt-1 flex items-center justify-between">
                <FieldError message={form.formState.errors.bio?.message} />
                <span className="text-[11px] text-muted-foreground">
                  {form.watch("bio")?.length ?? 0}/1500
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/40 p-4">
              <Controller
                control={form.control}
                name="isFreshGrad"
                render={({ field }) => (
                  <Checkbox
                    id="freshGrad"
                    checked={field.value}
                    onCheckedChange={(value) => field.onChange(value === true)}
                    className="mt-0.5"
                  />
                )}
              />
              <div>
                <Label htmlFor="freshGrad" className="text-[13px] font-semibold">
                  I am a fresh graduate or student
                </Label>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  Turns on fresh-grad scoring: experience counts far less, while
                  education, honors, OJT, certifications, and projects carry more weight.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Resume"
            description="PDF or DOCX, up to 5 MB. Only employers you apply to can open it."
            icon={FileText}
            contentClassName="space-y-3"
          >
            {profile?.resumeUrl ? (
              <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-primary card-shadow">
                    <FileText className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {profile.resumeName ?? "Resume"}
                    </p>
                    <p className="text-[11px] text-qualified">
                      Uploaded · visible to employers you apply to
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm" className="h-9 rounded-lg">
                    <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3.5" /> View
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 rounded-lg text-destructive hover:text-destructive"
                    onClick={async () => {
                      try {
                        await removeResume();
                        toast.success("Resume removed.");
                      } catch {
                        toast.error("Could not remove the resume.");
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => resumeInput.current?.click()}
                disabled={resumeBusy || !profile}
                className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center transition-colors hover:border-primary/40 hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resumeBusy ? (
                  <Loader2 className="size-6 animate-spin text-primary" />
                ) : (
                  <UploadCloud className="size-6 text-primary" />
                )}
                <span className="text-sm font-semibold">
                  {resumeBusy ? "Uploading resume…" : "Upload your resume"}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {profile
                    ? "Drag or click · PDF or DOCX · max 5 MB"
                    : "Save your details first to enable uploads"}
                </span>
              </button>
            )}
            <input
              ref={resumeInput}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf"
              className="hidden"
              onChange={(event) => void handleResume(event.target.files?.[0])}
            />
            {profile?.resumeUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-lg"
                onClick={() => resumeInput.current?.click()}
                disabled={resumeBusy}
              >
                {resumeBusy ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />}
                Replace resume
              </Button>
            )}
          </SectionCard>

          <SectionCard
            title="Skills"
            description="Matched against skill requirements. Add tools, languages, and methods."
            icon={Wrench}
          >
            <Controller
              control={form.control}
              name="skills"
              render={({ field }) => (
                <TagInput
                  value={field.value}
                  onChange={field.onChange}
                  suggestions={SKILL_SUGGESTIONS}
                />
              )}
            />
            <FieldError message={form.formState.errors.skills?.message} />
          </SectionCard>

          <SectionCard
            title="Education"
            description="Used for education requirements and fresh-grad scoring."
            icon={GraduationCap}
            contentClassName="space-y-3"
            actions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-lg"
                onClick={() => education.append(emptyEducation())}
              >
                <Plus className="size-3.5" /> Add
              </Button>
            }
          >
            {education.fields.map((field, index) => (
              <div key={field.id} className="rounded-xl border border-border/70 bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Education {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove education"
                    onClick={() => education.remove(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs font-semibold">School</Label>
                    <Input
                      className="mt-1 h-11 rounded-lg bg-card"
                      placeholder="University of the Philippines"
                      {...form.register(`education.${index}.school`)}
                    />
                    <FieldError message={form.formState.errors.education?.[index]?.school?.message} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Course</Label>
                    <Input
                      className="mt-1 h-11 rounded-lg bg-card"
                      placeholder="BS Information Technology"
                      {...form.register(`education.${index}.course`)}
                    />
                    <FieldError message={form.formState.errors.education?.[index]?.course?.message} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold">Year graduated</Label>
                      <Input
                        className="mt-1 h-11 rounded-lg bg-card"
                        placeholder="2025"
                        inputMode="numeric"
                        {...form.register(`education.${index}.yearGraduated`)}
                      />
                      <FieldError
                        message={form.formState.errors.education?.[index]?.yearGraduated?.message}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">GPA (optional)</Label>
                      <Input
                        className="mt-1 h-11 rounded-lg bg-card"
                        placeholder="1.50"
                        inputMode="decimal"
                        {...form.register(`education.${index}.gpa`)}
                      />
                      <FieldError message={form.formState.errors.education?.[index]?.gpa?.message} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Honors (optional)</Label>
                    <Input
                      className="mt-1 h-11 rounded-lg bg-card"
                      placeholder="Cum Laude, Dean's Lister"
                      {...form.register(`education.${index}.honors`)}
                    />
                  </div>
                </div>
              </div>
            ))}
            {education.fields.length === 0 && (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                No education added yet. Include your degree, diploma, or current studies.
              </p>
            )}
          </SectionCard>

          <SectionCard
            title="Work & OJT"
            description="Internships, part-time work, freelance, and org roles all count."
            icon={Award}
            contentClassName="space-y-3"
            actions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-lg"
                onClick={() => experience.append(emptyExperience())}
              >
                <Plus className="size-3.5" /> Add
              </Button>
            }
          >
            {experience.fields.map((field, index) => (
              <div key={field.id} className="rounded-xl border border-border/70 bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Experience {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove experience"
                    onClick={() => experience.remove(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs font-semibold">Role / title</Label>
                    <Input
                      className="mt-1 h-11 rounded-lg bg-card"
                      placeholder="Frontend Intern"
                      {...form.register(`experience.${index}.title`)}
                    />
                    <FieldError message={form.formState.errors.experience?.[index]?.title?.message} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Company / organisation</Label>
                    <Input
                      className="mt-1 h-11 rounded-lg bg-card"
                      placeholder="Kalinaw Digital"
                      {...form.register(`experience.${index}.company`)}
                    />
                    <FieldError
                      message={form.formState.errors.experience?.[index]?.company?.message}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold">Start year</Label>
                      <Input
                        className="mt-1 h-11 rounded-lg bg-card"
                        placeholder="2024"
                        inputMode="numeric"
                        {...form.register(`experience.${index}.startYear`)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">End year</Label>
                      <Input
                        className="mt-1 h-11 rounded-lg bg-card"
                        placeholder="Present"
                        inputMode="numeric"
                        {...form.register(`experience.${index}.endYear`)}
                      />
                      <FieldError message={form.formState.errors.experience?.[index]?.endYear?.message} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">What did you do?</Label>
                    <Textarea
                      className="mt-1 rounded-lg bg-card"
                      rows={3}
                      placeholder="Shipped the company's booking page with React and cut load time by 40%."
                      {...form.register(`experience.${index}.description`)}
                    />
                  </div>
                </div>
              </div>
            ))}
            {experience.fields.length === 0 && (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                No experience yet — add an OJT, internship, freelance project, or org role.
              </p>
            )}
          </SectionCard>

          <SectionCard
            title="Certifications & licenses"
            description="Exam-scheduled credentials earn partial credit and a tracked deadline."
            icon={Award}
            contentClassName="space-y-3"
            actions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-lg"
                onClick={() => certifications.append(emptyCertification())}
              >
                <Plus className="size-3.5" /> Add
              </Button>
            }
          >
            {certifications.fields.map((field, index) => (
              <div key={field.id} className="rounded-xl border border-border/70 bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Credential {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove credential"
                    onClick={() => certifications.remove(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs font-semibold">Name</Label>
                    <Input
                      className="mt-1 h-11 rounded-lg bg-card"
                      placeholder="Electronics Engineer Licensure Exam"
                      {...form.register(`certifications.${index}.name`)}
                    />
                    <FieldError
                      message={form.formState.errors.certifications?.[index]?.name?.message}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Issuer (optional)</Label>
                    <Input
                      className="mt-1 h-11 rounded-lg bg-card"
                      placeholder="PRC, TESDA, Cisco"
                      {...form.register(`certifications.${index}.issuer`)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Status</Label>
                    <Controller
                      control={form.control}
                      name={`certifications.${index}.status`}
                      render={({ field: statusField }) => (
                        <Select value={statusField.value} onValueChange={statusField.onChange}>
                          <SelectTrigger className="mt-1 h-11 rounded-lg bg-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CERTIFICATION_STATUSES.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold">Date</Label>
                      <Input
                        className="mt-1 h-11 rounded-lg bg-card"
                        placeholder="2026-04-15"
                        {...form.register(`certifications.${index}.date`)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Expiry</Label>
                      <Input
                        className="mt-1 h-11 rounded-lg bg-card"
                        placeholder="2030-04-15"
                        {...form.register(`certifications.${index}.expiry`)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {certifications.fields.length === 0 && (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                No credentials added. Include PRC licenses, TESDA NCs, or online certificates.
              </p>
            )}
          </SectionCard>

          <SectionCard
            title="Links"
            description="GitHub, LinkedIn, or a portfolio. https:// only."
            icon={Link2}
            contentClassName="grid gap-4 sm:grid-cols-3"
          >
            {(
              [
                { key: "github", label: "GitHub", placeholder: "https://github.com/you" },
                { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/you" },
                { key: "portfolio", label: "Portfolio", placeholder: "https://your-site.dev" },
              ] as const
            ).map((link) => (
              <div key={link.key}>
                <Label htmlFor={link.key} className="text-[13px] font-semibold">
                  {link.label}
                </Label>
                <Input
                  id={link.key}
                  className="mt-1.5 h-11 rounded-xl"
                  placeholder={link.placeholder}
                  {...form.register(link.key)}
                />
                <FieldError message={form.formState.errors[link.key]?.message} />
              </div>
            ))}
          </SectionCard>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl px-5"
              onClick={() => form.reset(profile ? formFromProfile(profile) : undefined)}
            >
              Discard changes
            </Button>
            <Button type="submit" disabled={saving} className="h-11 rounded-xl px-6">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>

        {/* Side rail */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border/70 bg-card p-5 card-shadow">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-bold">Profile strength</p>
              <span className="font-display text-xl font-extrabold text-primary">
                {completeness.percent}%
              </span>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${completeness.percent}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            {completeness.suggestions.length > 0 ? (
              <>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Suggested next
                </p>
                <ul className="mt-2 space-y-2">
                  {completeness.suggestions.slice(0, 4).map((suggestion) => (
                    <li key={suggestion} className="flex items-start gap-2 text-xs">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-conditional" />
                      <span className="text-muted-foreground">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-qualified-soft p-3 text-xs text-qualified">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                Everything essential is complete. Keep your credentials and resume fresh.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-5 card-shadow">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <p className="font-display text-sm font-bold">How you&apos;re scored</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Employers set requirements by category and weight. Your profile is checked
              against skills, certifications, education, and experience — never against
              your name, photo, or age.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip tone="accent">Skills</Chip>
              <Chip tone="accent">Credentials</Chip>
              <Chip tone="accent">Education</Chip>
              <Chip tone="accent">Experience</Chip>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              A license marked “exam scheduled” earns partial credit instead of failing
              the requirement.
            </p>
          </div>

          <div className="rounded-2xl border border-primary/15 bg-accent/60 p-5">
            <p className="text-xs font-bold">Fresh-grad mode</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {form.watch("isFreshGrad")
                ? "On. Experience weight is reduced for entry-level roles and your education, honors, and OJT carry more weight."
                : "Off. Turn it on if you are a fresh graduate or student so entry-level roles score you fairly."}
            </p>
            <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold">
              {profile?.resumeUrl ? (
                <>
                  <CheckCircle2 className="size-3.5 text-qualified" /> Resume on file
                </>
              ) : (
                <>
                  <FileText className="size-3.5 text-conditional" /> Resume still needed
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </PageTransition>
  );
}

export default ApplicantProfilePage;
