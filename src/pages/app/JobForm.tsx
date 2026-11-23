import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronDown,
  CircleHelp,
  Clock3,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { BucketBadge } from "@/components/shared/badges";
import { PageHeader, PageTransition, SectionCard } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useViewer } from "@/hooks/use-viewer";
import {
  EMPLOYMENT_TYPES,
  PH_LOCATIONS,
  REQUIREMENT_CATEGORIES,
  REQUIREMENT_TYPES,
} from "@/lib/constants";
import type { RequirementCategory, RequirementType } from "@/lib/scoring";
import { cn, generateId } from "@/lib/utils";

const schema = z.object({
  title: z.string().trim().min(4, "Give the role a clear title"),
  description: z.string().trim().min(40, "Write at least 40 characters about the role"),
  location: z.string().trim().min(2, "Add a work location"),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  salaryMin: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^\d+$/.test(value), "Numbers only"),
  salaryMax: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^\d+$/.test(value), "Numbers only"),
  deadline: z.string().optional(),
  isRemote: z.boolean(),
  isEntryLevel: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface RequirementDraft {
  id: string;
  label: string;
  category: RequirementCategory;
  type: RequirementType;
  weight: number;
  matchValue: string;
  minYears: string;
  gracePeriodDays: string;
  groupId: string;
  knockoutQuestion: string;
  knockoutEnabled: boolean;
  advanced: boolean;
}

function newRequirement(overrides: Partial<RequirementDraft> = {}): RequirementDraft {
  return {
    id: generateId(),
    label: "",
    category: "skill",
    type: "MANDATORY",
    weight: 30,
    matchValue: "",
    minYears: "1",
    gracePeriodDays: "90",
    groupId: "",
    knockoutQuestion: "",
    knockoutEnabled: false,
    advanced: false,
    ...overrides,
  };
}

const templates: Array<{ label: string; draft: () => RequirementDraft }> = [
  { label: "Skill", draft: () => newRequirement({ category: "skill", weight: 30 }) },
  {
    label: "Experience",
    draft: () =>
      newRequirement({ category: "experience", type: "PREFERRED", weight: 25, minYears: "1" }),
  },
  { label: "Education", draft: () => newRequirement({ category: "education", weight: 25 }) },
  {
    label: "License (later)",
    draft: () =>
      newRequirement({
        category: "certification",
        type: "OBTAINABLE_LATER",
        weight: 25,
        gracePeriodDays: "90",
      }),
  },
  {
    label: "Screening question",
    draft: () =>
      newRequirement({
        category: "other",
        type: "MANDATORY",
        weight: 10,
        knockoutEnabled: true,
      }),
  },
];

export default function JobForm() {
  const { jobId } = useParams<{ jobId: string }>();
  const isEdit = Boolean(jobId);
  const navigate = useNavigate();
  const { employer } = useViewer();
  const createJob = useMutation(api.jobs.create);
  const updateJob = useMutation(api.jobs.update);

  const existing = useQuery(
    api.jobs.get,
    jobId ? { jobId: jobId as Id<"jobs"> } : "skip",
  );

  const [requirements, setRequirements] = useState<RequirementDraft[]>([
    newRequirement({ category: "skill", weight: 35 }),
  ]);
  const [requirementError, setRequirementError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      employmentType: "Full-time",
      salaryMin: "",
      salaryMax: "",
      deadline: "",
      isRemote: false,
      isEntryLevel: false,
    },
  });

  useEffect(() => {
    if (!existing || hydrated) return;
    form.reset({
      title: existing.title,
      description: existing.description,
      location: existing.location,
      employmentType: existing.employmentType as FormValues["employmentType"],
      salaryMin: existing.salaryMin ? String(existing.salaryMin) : "",
      salaryMax: existing.salaryMax ? String(existing.salaryMax) : "",
      deadline: existing.deadline
        ? new Date(existing.deadline).toISOString().slice(0, 10)
        : "",
      isRemote: existing.isRemote,
      isEntryLevel: existing.isEntryLevel,
    });
    setRequirements(
      existing.requirements.map((requirement) => ({
        id: requirement.id,
        label: requirement.label,
        category: requirement.category,
        type: requirement.type,
        weight: requirement.weight,
        matchValue: requirement.matchValue ?? "",
        minYears: requirement.minYears ? String(requirement.minYears) : "1",
        gracePeriodDays: requirement.gracePeriodDays
          ? String(requirement.gracePeriodDays)
          : "90",
        groupId: requirement.groupId ?? "",
        knockoutQuestion: requirement.knockoutQuestion ?? "",
        knockoutEnabled: Boolean(requirement.knockoutQuestion),
        advanced: Boolean(
          requirement.matchValue ||
            requirement.groupId ||
            requirement.knockoutQuestion ||
            requirement.gracePeriodDays ||
            requirement.minYears,
        ),
      })),
    );
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, hydrated]);

  function updateRequirement(id: string, patch: Partial<RequirementDraft>) {
    setRequirements((previous) =>
      previous.map((requirement) =>
        requirement.id === id ? { ...requirement, ...patch } : requirement,
      ),
    );
  }

  function addAlternative(index: number) {
    const previous = requirements[index];
    if (!previous) return;
    const groupId = previous.groupId || `group_${previous.id.slice(0, 6)}`;
    updateRequirement(previous.id, { groupId });
    setRequirements((current) => [
      ...current,
      newRequirement({
        category: previous.category,
        type: previous.type,
        weight: previous.weight,
        groupId,
        advanced: true,
      }),
    ]);
  }

  async function onSubmit(values: FormValues) {
    if (!employer) {
      toast.error("Add your company profile before posting a job.");
      navigate("/app/profile?onboarding=1");
      return;
    }
    if (requirements.length === 0) {
      setRequirementError("Add at least one requirement.");
      return;
    }
    if (requirements.some((requirement) => !requirement.label.trim())) {
      setRequirementError("Every requirement needs a name.");
      return;
    }
    setRequirementError(null);
    setSaving(true);

    const payload = {
      title: values.title,
      description: values.description,
      location: values.isRemote ? values.location || "Remote (Philippines)" : values.location,
      isRemote: values.isRemote,
      employmentType: values.employmentType,
      salaryMin: values.salaryMin ? Number(values.salaryMin) : undefined,
      salaryMax: values.salaryMax ? Number(values.salaryMax) : undefined,
      isEntryLevel: values.isEntryLevel,
      deadline: values.deadline
        ? new Date(`${values.deadline}T23:59:59`).getTime()
        : undefined,
      requirements: requirements.map((requirement) => ({
        id: requirement.id,
        label: requirement.label.trim(),
        category: requirement.category,
        type: requirement.type,
        weight: requirement.weight,
        matchValue: requirement.matchValue.trim() || undefined,
        minYears:
          requirement.category === "experience" && requirement.minYears
            ? Number(requirement.minYears)
            : undefined,
        gracePeriodDays:
          requirement.type === "OBTAINABLE_LATER" && requirement.gracePeriodDays
            ? Number(requirement.gracePeriodDays)
            : undefined,
        groupId: requirement.groupId.trim() || undefined,
        knockoutQuestion:
          requirement.knockoutEnabled && requirement.knockoutQuestion.trim()
            ? requirement.knockoutQuestion.trim()
            : undefined,
      })),
    };

    try {
      if (isEdit && jobId) {
        await updateJob({ jobId: jobId as Id<"jobs">, ...payload });
        toast.success("Job updated. Applicant scores recalculated.");
        navigate(`/app/employer/jobs/${jobId}/applicants`);
      } else {
        const newJobId = await createJob(payload);
        toast.success("Job posted. Share it with applicants.");
        navigate(`/app/employer/jobs/${newJobId}/applicants`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the job.");
    } finally {
      setSaving(false);
    }
  }

  if (isEdit && existing === null) {
    return (
      <PageTransition className="space-y-4">
        <PageHeader
          title="This job post could not be found"
          description="It may have been deleted. Head back to your job posts to keep hiring."
        />
        <Button asChild className="h-10 w-fit rounded-xl">
          <Link to="/app/employer/jobs">Back to job posts</Link>
        </Button>
      </PageTransition>
    );
  }

  if (isEdit && existing && !existing.isOwner) {
    return (
      <PageTransition>
        <PageHeader title="Not your job post" description="You can only edit roles posted by your company." />
        <Button asChild className="mt-4 h-10 rounded-xl">
          <Link to="/app/employer/jobs">Back to job posts</Link>
        </Button>
      </PageTransition>
    );
  }

  const totalWeight = requirements.reduce(
    (sum, requirement) => sum + (Number(requirement.weight) || 0),
    0,
  );
  const mandatoryCount = requirements.filter((requirement) => requirement.type === "MANDATORY").length;

  return (
    <PageTransition className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-9 rounded-lg text-muted-foreground">
        <Link to="/app/employer/jobs">
          <ArrowLeft className="size-4" /> Job posts
        </Link>
      </Button>

      <PageHeader
        eyebrow={isEdit ? "Edit job" : "New job"}
        title={isEdit ? "Update this role and its requirements." : "Post a role that ranks fairly."}
        description="Requirements drive the qualification score. Keep must-haves few, mark what can be learned later, and let preferred skills add score without blocking people."
        actions={
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={saving}
            className="h-11 rounded-xl px-5"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? "Saving…" : isEdit ? "Save changes" : "Publish job"}
          </Button>
        }
      />

      {!employer && (
        <div className="rounded-2xl border border-conditional/25 bg-conditional-soft p-4 text-sm">
          Add your company profile before publishing.{" "}
          <Link to="/app/profile?onboarding=1" className="font-semibold underline underline-offset-2">
            Set up company
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <SectionCard
            title="Role basics"
            description="What the applicant sees first."
            contentClassName="space-y-4"
          >
            <div>
              <Label htmlFor="title" className="text-[13px] font-semibold">
                Job title *
              </Label>
              <Input
                id="title"
                className={cn("mt-1.5 h-11 rounded-xl", form.formState.errors.title && "border-unqualified")}
                placeholder="e.g. Junior Web Developer"
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="mt-1 text-xs text-unqualified">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description" className="text-[13px] font-semibold">
                Role description *
              </Label>
              <Textarea
                id="description"
                rows={6}
                className="mt-1.5 rounded-xl"
                placeholder="What the person will build, the team they'll join, and what the first 90 days look like."
                {...form.register("description")}
              />
              <div className="mt-1 flex justify-between">
                {form.formState.errors.description ? (
                  <p className="text-xs text-unqualified">
                    {form.formState.errors.description.message}
                  </p>
                ) : (
                  <span />
                )}
                <span className="text-[11px] text-muted-foreground">
                  {form.watch("description")?.length ?? 0} characters
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="location" className="text-[13px] font-semibold">
                  Location *
                </Label>
                <Input
                  id="location"
                  list="job-locations"
                  className={cn(
                    "mt-1.5 h-11 rounded-xl",
                    form.formState.errors.location && "border-unqualified",
                  )}
                  placeholder="e.g. Makati City (hybrid)"
                  {...form.register("location")}
                />
                <datalist id="job-locations">
                  {PH_LOCATIONS.map((location) => (
                    <option key={location} value={location} />
                  ))}
                </datalist>
                {form.formState.errors.location && (
                  <p className="mt-1 text-xs text-unqualified">
                    {form.formState.errors.location.message}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-[13px] font-semibold">Employment type</Label>
                <Select
                  value={form.watch("employmentType")}
                  onValueChange={(value) =>
                    form.setValue("employmentType", value as FormValues["employmentType"])
                  }
                >
                  <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="salaryMin" className="text-[13px] font-semibold">
                  Salary minimum (₱/month)
                </Label>
                <Input
                  id="salaryMin"
                  inputMode="numeric"
                  className="mt-1.5 h-11 rounded-xl"
                  placeholder="25000"
                  {...form.register("salaryMin")}
                />
                {form.formState.errors.salaryMin && (
                  <p className="mt-1 text-xs text-unqualified">
                    {form.formState.errors.salaryMin.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="salaryMax" className="text-[13px] font-semibold">
                  Salary maximum (₱/month)
                </Label>
                <Input
                  id="salaryMax"
                  inputMode="numeric"
                  className="mt-1.5 h-11 rounded-xl"
                  placeholder="40000"
                  {...form.register("salaryMax")}
                />
                {form.formState.errors.salaryMax && (
                  <p className="mt-1 text-xs text-unqualified">
                    {form.formState.errors.salaryMax.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="deadline" className="text-[13px] font-semibold">
                  Application deadline
                </Label>
                <Input
                  id="deadline"
                  type="date"
                  className="mt-1.5 h-11 rounded-xl"
                  {...form.register("deadline")}
                />
              </div>
              <div className="flex flex-col justify-center gap-3 rounded-xl border border-border/70 bg-muted/30 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="isRemote" className="text-xs font-semibold">
                    Remote
                  </Label>
                  <Switch
                    id="isRemote"
                    checked={form.watch("isRemote")}
                    onCheckedChange={(value) => form.setValue("isRemote", value)}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="isEntryLevel" className="text-xs font-semibold">
                    Entry level
                  </Label>
                  <Switch
                    id="isEntryLevel"
                    checked={form.watch("isEntryLevel")}
                    onCheckedChange={(value) => form.setValue("isEntryLevel", value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-primary/15 bg-accent/60 p-3.5">
              <GraduationCap className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Entry-level roles</span> turn on
                fresh-grad scoring: experience weight drops to 15% and education,
                certifications, honors, and OJT gain weight.
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title="Requirements"
            description="Each one is checked against the applicant's profile. Use the same OR group ID to accept alternatives."
            icon={Layers}
            contentClassName="space-y-3"
            actions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-lg"
                onClick={() => setRequirements((current) => [...current, newRequirement()])}
              >
                <Plus className="size-3.5" /> Add
              </Button>
            }
          >
            <div className="flex flex-wrap gap-1.5">
              <span className="mr-1 self-center text-[11px] text-muted-foreground">Quick add:</span>
              {templates.map((template) => (
                <button
                  key={template.label}
                  type="button"
                  onClick={() =>
                    setRequirements((current) => [...current, template.draft()])
                  }
                  className="rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  + {template.label}
                </button>
              ))}
            </div>

            {requirements.map((requirement, index) => (
              <div
                key={requirement.id}
                className="rounded-xl border border-border/70 bg-muted/25 p-4"
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-2 flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-[10px] font-bold text-muted-foreground card-shadow">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
                      <div>
                        <Label className="text-xs font-semibold">Requirement *</Label>
                        <Input
                          value={requirement.label}
                          onChange={(event) =>
                            updateRequirement(requirement.id, { label: event.target.value })
                          }
                          placeholder={
                            REQUIREMENT_CATEGORIES.find(
                              (category) => category.value === requirement.category,
                            )?.matchPlaceholder
                          }
                          className="mt-1 h-10 rounded-lg bg-card"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Category</Label>
                        <Select
                          value={requirement.category}
                          onValueChange={(value) =>
                            updateRequirement(requirement.id, {
                              category: value as RequirementCategory,
                            })
                          }
                        >
                          <SelectTrigger className="mt-1 h-10 rounded-lg bg-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {REQUIREMENT_CATEGORIES.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                      <div>
                        <Label className="text-xs font-semibold">Rule</Label>
                        <Select
                          value={requirement.type}
                          onValueChange={(value) =>
                            updateRequirement(requirement.id, {
                              type: value as RequirementType,
                            })
                          }
                        >
                          <SelectTrigger className="mt-1 h-10 rounded-lg bg-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {REQUIREMENT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Weight</Label>
                        <div className="mt-1 flex h-10 items-center gap-2 rounded-lg border border-input bg-card px-2.5">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={requirement.weight}
                            onChange={(event) =>
                              updateRequirement(requirement.id, {
                                weight: Number(event.target.value),
                              })
                            }
                            className="h-1.5 w-full accent-primary"
                            aria-label={`Weight for ${requirement.label || "requirement"}`}
                          />
                          <span className="w-7 shrink-0 text-right text-xs font-bold tabular-nums">
                            {requirement.weight}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] leading-relaxed text-muted-foreground">
                      {REQUIREMENT_TYPES.find((type) => type.value === requirement.type)?.hint}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateRequirement(requirement.id, {
                            advanced: !requirement.advanced,
                          })
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary"
                      >
                        <ChevronDown
                          className={cn(
                            "size-3.5 transition-transform",
                            requirement.advanced && "rotate-180",
                          )}
                        />
                        {requirement.advanced ? "Hide matching rules" : "Matching rules"}
                      </button>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => addAlternative(index)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary"
                        >
                          <Plus className="size-3.5" /> Add OR alternative
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setRequirements((current) =>
                            current.filter((item) => item.id !== requirement.id),
                          )
                        }
                        className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" /> Remove
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {requirement.advanced && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="grid gap-3 rounded-lg border border-border/60 bg-card p-3 sm:grid-cols-2">
                            <div>
                              <Label className="text-[11px] font-semibold">
                                {REQUIREMENT_CATEGORIES.find(
                                  (category) => category.value === requirement.category,
                                )?.matchLabel ?? "Text to match"}
                              </Label>
                              <Input
                                value={requirement.matchValue}
                                onChange={(event) =>
                                  updateRequirement(requirement.id, {
                                    matchValue: event.target.value,
                                  })
                                }
                                placeholder="Defaults to the requirement name"
                                className="mt-1 h-9 rounded-lg"
                              />
                            </div>
                            {requirement.category === "experience" && (
                              <div>
                                <Label className="text-[11px] font-semibold">Minimum years</Label>
                                <Input
                                  inputMode="numeric"
                                  value={requirement.minYears}
                                  onChange={(event) =>
                                    updateRequirement(requirement.id, {
                                      minYears: event.target.value,
                                    })
                                  }
                                  className="mt-1 h-9 rounded-lg"
                                />
                              </div>
                            )}
                            {requirement.type === "OBTAINABLE_LATER" && (
                              <div>
                                <Label className="text-[11px] font-semibold">
                                  Grace period (days)
                                </Label>
                                <Input
                                  inputMode="numeric"
                                  value={requirement.gracePeriodDays}
                                  onChange={(event) =>
                                    updateRequirement(requirement.id, {
                                      gracePeriodDays: event.target.value,
                                    })
                                  }
                                  className="mt-1 h-9 rounded-lg"
                                />
                              </div>
                            )}
                            <div>
                              <Label className="text-[11px] font-semibold">
                                OR group ID (optional)
                              </Label>
                              <Input
                                value={requirement.groupId}
                                onChange={(event) =>
                                  updateRequirement(requirement.id, {
                                    groupId: event.target.value,
                                  })
                                }
                                placeholder="e.g. credential"
                                className="mt-1 h-9 rounded-lg"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <div className="flex items-center justify-between gap-3">
                                <Label className="text-[11px] font-semibold">
                                  Knockout question on the application form
                                </Label>
                                <Switch
                                  checked={requirement.knockoutEnabled}
                                  onCheckedChange={(value) =>
                                    updateRequirement(requirement.id, {
                                      knockoutEnabled: value,
                                    })
                                  }
                                />
                              </div>
                              {requirement.knockoutEnabled && (
                                <Input
                                  value={requirement.knockoutQuestion}
                                  onChange={(event) =>
                                    updateRequirement(requirement.id, {
                                      knockoutQuestion: event.target.value,
                                    })
                                  }
                                  placeholder="e.g. Are you authorised to work in the Philippines?"
                                  className="mt-2 h-9 rounded-lg"
                                />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            ))}

            {requirementError && (
              <p className="text-xs text-unqualified">{requirementError}</p>
            )}

            {requirements.length === 0 && (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                Add at least one requirement so Trabalink can score applicants.
              </p>
            )}
          </SectionCard>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button asChild type="button" variant="outline" className="h-11 rounded-xl px-5">
              <Link to="/app/employer/jobs">Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving} className="h-11 rounded-xl px-6">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Saving…" : isEdit ? "Save changes" : "Publish job"}
            </Button>
          </div>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border/70 bg-card p-5 card-shadow">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h2 className="font-display text-sm font-bold">Scoring preview</h2>
            </div>
            <div className="mt-3 space-y-2.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Requirements</span>
                <span className="font-bold">{requirements.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mandatory</span>
                <span className="font-bold">{mandatoryCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total weight</span>
                <span className="font-bold">{totalWeight}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mode</span>
                <span className="font-bold">
                  {form.watch("isEntryLevel") ? "Fresh-grad friendly" : "Standard"}
                </span>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, totalWeight)}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              Weights are relative. Scores are normalised to 100, so the total does not
              need to equal 100.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <BucketBadge bucket="QUALIFIED" compact />
              <BucketBadge bucket="CONDITIONALLY_QUALIFIED" compact />
              <BucketBadge bucket="NOT_QUALIFIED" compact />
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-5 card-shadow">
            <div className="flex items-center gap-2">
              <CircleHelp className="size-4 text-primary" />
              <h2 className="font-display text-sm font-bold">A calmer requirement set</h2>
            </div>
            <ul className="mt-2.5 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
              <li>• Keep mandatory requirements to things you truly cannot train.</li>
              <li>• Use “obtainable later” for licenses and certifications with a date.</li>
              <li>• Put nice-to-haves at 10–25 weight as preferred.</li>
              <li>• Use OR groups for “license OR degree + exam scheduled”.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-conditional/25 bg-conditional-soft p-5">
            <div className="flex items-center gap-2">
              <Clock3 className="size-4 text-conditional" />
              <h2 className="font-display text-sm font-bold">Conditional tracking</h2>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Requirements marked “obtainable later” create dated reminders on your
              dashboard when an applicant is missing them.
            </p>
          </div>

          <div className="rounded-2xl border border-primary/15 bg-accent/60 p-5">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <h2 className="font-display text-sm font-bold">Human decision</h2>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Nothing is auto-rejected. You can move any applicant forward with a note,
              even if the score says they are not qualified.
            </p>
          </div>
        </aside>
      </div>
    </PageTransition>
  );
}
