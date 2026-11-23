import { Link } from "react-router";
import { ShieldCheck } from "lucide-react";
import { PageTransition, SectionCard } from "@/components/shared/page";
import { Chip } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { useViewer } from "@/hooks/use-viewer";
import { ApplicantProfilePage } from "./ApplicantProfile";
import { EmployerProfilePage } from "./EmployerProfile";

function AdminAccountView() {
  const { viewer } = useViewer();
  return (
    <PageTransition className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Administrator account
        </p>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.03em]">
          Platform administration does not use a hiring profile.
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Administrator accounts moderate accounts and job posts. They cannot create an
          applicant profile, apply to roles, or read private conversations and files.
        </p>
      </div>

      <SectionCard
        title="Account"
        icon={ShieldCheck}
        description="Signed in with a verified email address."
        actions={<Chip tone="accent">Administrator</Chip>}
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Name
            </dt>
            <dd className="mt-1 font-medium">{viewer?.user.name ?? "Administrator"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Email
            </dt>
            <dd className="mt-1 font-medium">{viewer?.user.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Access scope
            </dt>
            <dd className="mt-1 font-medium">Account and job moderation</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Privacy
            </dt>
            <dd className="mt-1 font-medium">Private messages and resumes excluded</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild className="h-10 rounded-xl">
            <Link to="/app/admin">Open moderation console</Link>
          </Button>
          <Button asChild variant="outline" className="h-10 rounded-xl">
            <Link to="/app/jobs">Browse role catalog</Link>
          </Button>
        </div>
      </SectionCard>
    </PageTransition>
  );
}

export default function Profile() {
  const { viewer } = useViewer();
  if (viewer?.user.role === "admin") return <AdminAccountView />;
  if (viewer?.user.role === "employer") return <EmployerProfilePage />;
  return <ApplicantProfilePage />;
}
