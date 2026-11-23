import { useQuery } from "convex/react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { api } from "@/convex/_generated/api";
import { ScreenLoader } from "@/components/shared/page";

/**
 * Role gate for authenticated areas. Missing roles are sent to onboarding, and
 * the wrong role is sent back to their own dashboard instead of seeing a
 * permission error they cannot act on.
 */
export function RequireRole({
  role,
  children,
}: {
  role?: "applicant" | "employer";
  children: ReactNode;
}) {
  const viewer = useQuery(api.profiles.viewer);
  const location = useLocation();

  if (viewer === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <ScreenLoader label="Opening your workspace" />
      </div>
    );
  }

  if (viewer === null) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  if (
    viewer.user.role !== "applicant" &&
    viewer.user.role !== "employer" &&
    viewer.user.role !== "admin"
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  if (role && viewer.user.role !== role) {
    return <Navigate to="/app" replace />;
  }

  return children;
}
