import { useMutation } from "convex/react";
import { Check, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

/**
 * Follows a company so its new roles land in the applicant's feed and
 * notifications. The feed itself is reactive, so no local copy is kept.
 */
export function FollowButton({
  employerId,
  following,
  className,
  size = "sm",
}: {
  employerId: Id<"users">;
  following: boolean;
  className?: string;
  size?: "sm" | "xs";
}) {
  const toggle = useMutation(api.network.toggleFollow);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      const result = await toggle({ employerId });
      toast.success(
        result.following
          ? "Following. New roles from this company will notify you."
          : "Unfollowed this company.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update following.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={following ? "outline" : "default"}
      onClick={handleClick}
      disabled={busy}
      aria-pressed={following}
      className={cn(
        "shrink-0 rounded-full font-semibold",
        size === "xs" ? "h-9 px-3 text-[11px]" : "h-9 px-3.5 text-xs",
        following && "border-border bg-transparent text-muted-foreground",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="size-3 animate-spin" />
      ) : following ? (
        <Check className="size-3" />
      ) : (
        <Plus className="size-3" />
      )}
      {following ? "Following" : "Follow"}
    </Button>
  );
}
