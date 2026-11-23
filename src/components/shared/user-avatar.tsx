import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials, initialsColor } from "@/lib/format";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  src,
  className,
  fallbackClassName,
}: {
  name: string | undefined;
  src?: string | null;
  className?: string;
  fallbackClassName?: string;
}) {
  return (
    <Avatar className={cn("size-10 border border-border/70", className)}>
      {src ? <AvatarImage src={src} alt={name ? `${name} profile photo` : "Profile photo"} /> : null}
      <AvatarFallback
        className={cn(
          "text-xs font-bold",
          initialsColor(name ?? "trabalink"),
          fallbackClassName,
        )}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
