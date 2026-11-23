import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { motion } from "framer-motion";
import {
  Building2,
  Camera,
  CheckCircle2,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader, PageTransition, SectionCard } from "@/components/shared/page";
import { LogoMark } from "@/components/brand/brand";
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useUploader } from "@/hooks/use-upload";
import { useViewer } from "@/hooks/use-viewer";
import { isEmailConfigured } from "@/lib/email";
import { COMPANY_SIZES, INDUSTRIES, PH_LOCATIONS } from "@/lib/constants";
import { employerCompleteness } from "@/lib/profile";
import { cn } from "@/lib/utils";

const schema = z.object({
  companyName: z.string().trim().min(2, "Company name is required"),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  location: z.string().trim().max(120).optional(),
  website: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^https:\/\/.+\..+/.test(value), "Must start with https://"),
  contactEmail: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Use a valid email address",
    ),
  description: z.string().trim().max(2000).optional(),
});

type FormValues = z.infer<typeof schema>;

type EmployerProfileDoc = Doc<"employerProfiles"> & { logoUrl?: string };

export function EmployerProfilePage() {
  const { employer, viewer } = useViewer();
  const saveProfile = useMutation(api.profiles.upsertEmployerProfile);
  const attachPhoto = useMutation(api.profiles.attachPhoto);
  const { upload } = useUploader();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "1";
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  const profile = employer as EmployerProfileDoc | null;
  const completeness = employerCompleteness(profile);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: "",
      industry: "",
      companySize: "",
      location: "",
      website: "",
      contactEmail: "",
      description: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        companyName: profile.companyName,
        industry: profile.industry ?? "",
        companySize: profile.companySize ?? "",
        location: profile.location ?? "",
        website: profile.website ?? "",
        contactEmail: profile.contactEmail ?? viewer?.user.email ?? "",
        description: profile.description ?? "",
      });
    } else {
      form.setValue("companyName", viewer?.user.name ?? "");
      form.setValue("contactEmail", viewer?.user.email ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?._id, viewer?.user.email]);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      await saveProfile({
        companyName: values.companyName,
        industry: values.industry,
        companySize: values.companySize,
        location: values.location,
        website: values.website,
        contactEmail: values.contactEmail,
        description: values.description,
      });
      toast.success("Company profile saved.");
      if (isOnboarding) navigate("/app/employer/jobs/new", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your company profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogo(file: File | undefined) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Logo must be under 3 MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (!profile) {
      toast.error("Save your company details first, then upload a logo.");
      return;
    }
    setLogoBusy(true);
    try {
      const storageId = await upload(file);
      await attachPhoto({ storageId });
      toast.success("Company logo updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Logo upload failed.");
    } finally {
      setLogoBusy(false);
      if (logoInput.current) logoInput.current.value = "";
    }
  }

  return (
    <PageTransition className="space-y-6">
      <PageHeader
        eyebrow={isOnboarding ? "Step 2 of 2" : "Company profile"}
        title={isOnboarding ? "Introduce your company" : "Your company, as applicants see it."}
        description="Company details appear on every job post. Contact email receives applicant alerts when EmailJS is configured."
        actions={
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={saving}
            className="h-11 rounded-xl px-5"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            {saving ? "Saving…" : "Save company"}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <SectionCard
            title="Company identity"
            description="Used on job posts and in the applicant pipeline."
            icon={Building2}
            contentClassName="space-y-5"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                {profile?.logoUrl ? (
                  <img
                    src={profile.logoUrl}
                    alt={`${profile.companyName} logo`}
                    className="size-16 rounded-2xl border border-border object-cover"
                  />
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-muted">
                    <LogoMark className="size-10" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => logoInput.current?.click()}
                  disabled={logoBusy}
                  className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border border-border bg-card text-primary card-shadow transition-colors hover:bg-accent disabled:opacity-50"
                  aria-label="Upload company logo"
                >
                  {logoBusy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Camera className="size-3.5" />
                  )}
                </button>
                <input
                  ref={logoInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void handleLogo(event.target.files?.[0])}
                />
              </div>
              <div>
                <p className="text-sm font-semibold">Company logo</p>
                <p className="text-[11px] text-muted-foreground">
                  Square images look best · up to 3 MB
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="companyName" className="text-[13px] font-semibold">
                  Company name *
                </Label>
                <Input
                  id="companyName"
                  className={cn("mt-1.5 h-11 rounded-xl", form.formState.errors.companyName && "border-unqualified")}
                  {...form.register("companyName")}
                />
                {form.formState.errors.companyName && (
                  <p className="mt-1 text-xs text-unqualified">
                    {form.formState.errors.companyName.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="location" className="text-[13px] font-semibold">
                  Headquarters
                </Label>
                <Input
                  id="location"
                  list="company-locations"
                  className="mt-1.5 h-11 rounded-xl"
                  placeholder="e.g. Makati City"
                  {...form.register("location")}
                />
                <datalist id="company-locations">
                  {PH_LOCATIONS.map((location) => (
                    <option key={location} value={location} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label className="text-[13px] font-semibold">Industry</Label>
                <Input
                  list="company-industries"
                  className="mt-1.5 h-11 rounded-xl"
                  placeholder="Start typing or pick one"
                  {...form.register("industry")}
                />
                <datalist id="company-industries">
                  {INDUSTRIES.map((industry) => (
                    <option key={industry} value={industry} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label className="text-[13px] font-semibold">Company size</Label>
                <Select
                  value={form.watch("companySize")}
                  onValueChange={(value) => form.setValue("companySize", value)}
                >
                  <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="website" className="text-[13px] font-semibold">
                  Website
                </Label>
                <Input
                  id="website"
                  className="mt-1.5 h-11 rounded-xl"
                  placeholder="https://company.ph"
                  {...form.register("website")}
                />
                {form.formState.errors.website && (
                  <p className="mt-1 text-xs text-unqualified">
                    {form.formState.errors.website.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="contactEmail" className="text-[13px] font-semibold">
                  Hiring contact email
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  className="mt-1.5 h-11 rounded-xl"
                  placeholder="hiring@company.ph"
                  {...form.register("contactEmail")}
                />
                {form.formState.errors.contactEmail && (
                  <p className="mt-1 text-xs text-unqualified">
                    {form.formState.errors.contactEmail.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="description" className="text-[13px] font-semibold">
                About the company
              </Label>
              <Textarea
                id="description"
                rows={5}
                className="mt-1.5 rounded-xl"
                placeholder="What the team builds, how you work, and what a new hire can expect."
                {...form.register("description")}
              />
              <div className="mt-1 flex items-center justify-between">
                {form.formState.errors.description ? (
                  <p className="text-xs text-unqualified">
                    {form.formState.errors.description.message}
                  </p>
                ) : (
                  <span />
                )}
                <span className="text-[11px] text-muted-foreground">
                  {form.watch("description")?.length ?? 0}/2000
                </span>
              </div>
            </div>
          </SectionCard>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl px-5"
              onClick={() =>
                form.reset(
                  profile
                    ? {
                        companyName: profile.companyName,
                        industry: profile.industry ?? "",
                        companySize: profile.companySize ?? "",
                        location: profile.location ?? "",
                        website: profile.website ?? "",
                        contactEmail: profile.contactEmail ?? "",
                        description: profile.description ?? "",
                      }
                    : undefined,
                )
              }
            >
              Discard changes
            </Button>
            <Button type="submit" disabled={saving} className="h-11 rounded-xl px-6">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {saving ? "Saving…" : "Save company"}
            </Button>
          </div>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border/70 bg-card p-5 card-shadow">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-bold">Company profile strength</p>
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
              <ul className="mt-4 space-y-2">
                {completeness.suggestions.slice(0, 4).map((suggestion) => (
                  <li key={suggestion} className="flex items-start gap-2 text-xs">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-conditional" />
                    <span className="text-muted-foreground">{suggestion}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-qualified-soft p-3 text-xs text-qualified">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                Your company profile is complete and ready for job posts.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-5 card-shadow">
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-primary" />
              <p className="font-display text-sm font-bold">Applicant email alerts</p>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {isEmailConfigured()
                ? "EmailJS is connected. Applicants receive a receipt and this inbox receives a review alert for every new application."
                : "Add VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY in the Keys panel to send application receipts and review alerts."}
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-5 card-shadow">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <p className="font-display text-sm font-bold">Applicant trust signals</p>
            </div>
            <ul className="mt-3 space-y-2.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <Globe className="size-3.5 text-primary" /> Website verified on your post
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="size-3.5 text-primary" /> Clear work location
              </li>
              <li className="flex items-center gap-2">
                <Users className="size-3.5 text-primary" /> Team size shown to applicants
              </li>
              <li className="flex items-center gap-2">
                <Mail className="size-3.5 text-primary" /> A real hiring contact
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </PageTransition>
  );
}

export default EmployerProfilePage;
