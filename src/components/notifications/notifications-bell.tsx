import { useMutation, useQuery } from "convex/react";
import {
  Bell,
  BellOff,
  BriefcaseBusiness,
  CalendarClock,
  CheckCheck,
  MessagesSquare,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  new_job: BriefcaseBusiness,
  application_status: CheckCheck,
  interview: CalendarClock,
  follower: UserPlus,
  message: MessagesSquare,
  system: Sparkles,
} as const;

export function NotificationsBell() {
  const navigate = useNavigate();
  const items = useQuery(api.notifications.list, { limit: 12 });
  const unread = useQuery(api.notifications.unreadCount) ?? 0;
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={
            unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
          }
          className="relative flex size-10 items-center justify-center rounded-full border border-border/70 bg-card/60 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground sm:size-9"
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold leading-4 text-gold-foreground ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[21rem] p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-[13px] font-bold">
            Notifications
          </DropdownMenuLabel>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] font-semibold"
              onClick={() => void markAllRead({})}
            >
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-[22rem] overflow-y-auto">
          {items === undefined ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-12 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-8 text-center">
              <BellOff className="size-5 text-muted-foreground" />
              <p className="mt-2 text-xs font-semibold">Nothing yet</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Follow companies to hear about new roles first.
              </p>
            </div>
          ) : (
            <ul className="feed-divide">
              {items.map((item) => {
                const Icon =
                  KIND_ICON[item.kind as keyof typeof KIND_ICON] ?? Sparkles;
                return (
                  <li key={item._id}>
                    <button
                      type="button"
                      onClick={() => {
                        void markRead({
                          notificationId: item._id as Id<"notifications">,
                        });
                        if (item.href) navigate(item.href);
                      }}
                      className={cn(
                        "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
                        !item.read && "bg-gold-soft/30",
                      )}
                    >
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-1.5">
                          <span className="line-clamp-1 text-[12px] font-semibold">
                            {item.title}
                          </span>
                          {!item.read && (
                            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-gold" />
                          )}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-[11px] leading-relaxed text-muted-foreground">
                          {item.body}
                        </span>
                        <span className="mt-1 block text-[10px] text-muted-foreground/80">
                          {timeAgo(item.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
