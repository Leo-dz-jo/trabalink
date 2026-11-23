import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * One reactive subscription for the signed-in user plus their role profile.
 * `viewer` is `undefined` while loading and `null` when signed out.
 */
export function useViewer() {
  const viewer = useQuery(api.profiles.viewer);
  return {
    viewer,
    isLoading: viewer === undefined,
    isSignedIn: Boolean(viewer),
    role: viewer?.user.role ?? null,
    applicant: viewer?.applicant ?? null,
    employer: viewer?.employer ?? null,
  };
}
