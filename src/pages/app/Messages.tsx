import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowRight, Compass, MessageSquare, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { EmptyState, PageHeader, PageTransition } from "@/components/shared/page";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useViewer } from "@/hooks/use-viewer";
import { timeAgo } from "@/lib/format";

export default function Messages() {
  const { viewer, applicant, employer } = useViewer();
  const conversations = useQuery(api.conversations.list);
  const [search, setSearch] = useState("");
  const isEmployer = viewer?.user.role === "employer";
  const isAdmin = viewer?.user.role === "admin";

  const unread = conversations?.reduce((total, row) => total + row.unread, 0) ?? 0;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!conversations) return [];
    if (!term) return conversations;
    return conversations.filter(
      (row) =>
        row.counterpart.name.toLowerCase().includes(term) ||
        row.jobTitle.toLowerCase().includes(term) ||
        row.lastMessagePreview.toLowerCase().includes(term),
    );
  }, [conversations, search]);

  const hasProfile = isEmployer ? Boolean(employer) : Boolean(applicant);

  return (
    <PageTransition className="space-y-6">
      <PageHeader
        eyebrow="Messages"
        title="Conversations about the work."
        description={
          isAdmin
            ? "Administrator accounts cannot read private applicant or employer conversations."
            : isEmployer
              ? "Private threads with applicants to your roles. Ask about availability, evidence, or next steps without leaving the review workflow."
              : "Private threads with hiring teams. Ask about a role, clarify a requirement, or follow up after applying."
        }
        actions={
          unread > 0 ? (
            <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-primary/15 bg-accent px-3.5 text-xs font-semibold text-accent-foreground">
              <MessageSquare className="size-4" />
              {unread} unread
            </span>
          ) : undefined
        }
      />

      {!isAdmin && (
        <div className="rounded-2xl border border-border/70 bg-card p-4 card-shadow">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <MessageSquare className="size-4" />
              </span>
              <p className="max-w-xl text-[11px] leading-relaxed text-muted-foreground">
                Messages are visible only to you and the other participant. Trabalink
                administrators cannot read private conversations. Do not share government
                IDs or bank details in a thread.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations"
                className="h-10 rounded-xl pl-8"
              />
            </div>
          </div>
        </div>
      )}

      {conversations === undefined ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-2xl border border-border/70 bg-card"
            />
          ))}
        </div>
      ) : isAdmin ? (
        <EmptyState
          icon={MessageSquare}
          title="Private conversations stay private"
          description="Administrator accounts cannot read applicant or employer messages. Use the moderation console for platform-level actions."
        >
          <Button asChild className="h-10 rounded-xl">
            <Link to="/app/admin">Open moderation console</Link>
          </Button>
        </EmptyState>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No conversations yet"
          description={
            isEmployer
              ? "Open an applicant from your pipeline and start a thread. Conversations stay attached to the role."
              : "Open a role in the catalog and message the hiring team with a specific question about the work."
          }
        >
          {isEmployer ? (
            <Button asChild className="h-10 rounded-xl">
              <Link to="/app/employer/pipeline">
                <Users className="size-4" /> Open pipeline
              </Link>
            </Button>
          ) : (
            <Button asChild className="h-10 rounded-xl">
              <Link to="/app/jobs">
                <Compass className="size-4" /> Browse role catalog
              </Link>
            </Button>
          )}
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No conversations match that search"
          description="Try a different name, role, or phrase from the message."
        >
          <Button variant="outline" className="h-10 rounded-xl" onClick={() => setSearch("")}>
            Clear search
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-2.5">
          {visible.map((conversation, index) => (
            <motion.div
              key={conversation._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.04, 0.25) }}
            >
              <Link
                to={`/app/messages/${conversation._id}`}
                className="group flex items-start gap-3.5 rounded-2xl border border-border/70 bg-card p-4 card-shadow transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:card-shadow-lg"
              >
                <UserAvatar
                  name={conversation.counterpart.name}
                  src={conversation.counterpart.photoUrl}
                  className="size-11"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold group-hover:text-primary">
                      {conversation.counterpart.name}
                    </p>
                    {conversation.unread > 0 && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                        {conversation.unread} new
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                    {conversation.jobTitle}
                  </p>
                  <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground">
                    {conversation.lastSenderId === viewer?.user._id ? "You: " : ""}
                    {conversation.lastMessagePreview}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {timeAgo(conversation.lastMessageAt)}
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {!hasProfile && !isAdmin && conversations && conversations.length === 0 && (
        <p className="text-center text-[11px] text-muted-foreground">
          Complete your profile to start conversations.{" "}
          <Link to="/app/profile" className="font-semibold text-primary underline-offset-4 hover:underline">
            Open profile
          </Link>
        </p>
      )}
    </PageTransition>
  );
}
