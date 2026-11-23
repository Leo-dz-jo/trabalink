import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  MessageSquare,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { EmptyState, PageTransition } from "@/components/shared/page";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatMessageDay, formatMessageTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function Conversation() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const conversation = useQuery(
    api.conversations.get,
    conversationId ? { conversationId: conversationId as Id<"conversations"> } : "skip",
  );
  const sendMessage = useMutation(api.conversations.send);
  const markRead = useMutation(api.conversations.markRead);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messageCount = conversation?.messages.length ?? 0;

  useEffect(() => {
    if (!conversationId || !conversation) return;
    void markRead({ conversationId: conversationId as Id<"conversations"> }).catch((error) => {
      console.warn("[Trabalink] Could not mark messages read", error);
    });
  }, [conversationId, conversation?._id, messageCount, markRead]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [messageCount]);

  async function submit() {
    if (!conversationId || draft.trim().length === 0) return;
    setSending(true);
    try {
      await sendMessage({
        conversationId: conversationId as Id<"conversations">,
        body: draft,
      });
      setDraft("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send your message.");
    } finally {
      setSending(false);
    }
  }

  if (!conversationId) {
    return <EmptyState icon={MessageSquare} title="Conversation not found" />;
  }

  if (conversation === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-[60vh] animate-pulse rounded-2xl border border-border/70 bg-card" />
      </div>
    );
  }

  if (conversation === null) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="This conversation is unavailable"
        description="It may have been removed, or you are not a participant in this thread."
      >
        <Button asChild variant="outline" className="h-10 rounded-xl">
          <Link to="/app/messages">Back to messages</Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <PageTransition className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-9 rounded-lg text-muted-foreground">
        <Link to="/app/messages">
          <ArrowLeft className="size-4" /> Messages
        </Link>
      </Button>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card card-shadow">
        <header className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <UserAvatar
              name={conversation.counterpart.name}
              src={conversation.counterpart.photoUrl}
              className="size-11"
            />
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold">
                {conversation.counterpart.name}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {conversation.counterpart.headline ??
                  (conversation.role === "employer" ? "Applicant" : "Hiring team")}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="h-9 w-fit rounded-lg">
            <Link to={`/app/jobs/${conversation.jobId}`}>
              {conversation.jobTitle} <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        </header>

        <div
          ref={scrollRef}
          className="max-h-[58vh] min-h-[320px] overflow-y-auto bg-muted/20 px-4 py-5 sm:px-6"
        >
          {conversation.messages.length === 0 ? (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
              <MessageSquare className="size-6 text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold">No messages yet</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Send the first message about {conversation.jobTitle}.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {conversation.messages.map((message, index) => {
                const day = formatMessageDay(message.createdAt);
                const previous = conversation.messages[index - 1];
                const showDay = !previous || formatMessageDay(previous.createdAt) !== day;
                return (
                  <li key={message._id}>
                    {showDay && (
                      <p className="mb-3 mt-4 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground first:mt-0">
                        {day}
                      </p>
                    )}
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.02, 0.25) }}
                      className={cn(
                        "flex flex-col",
                        message.mine ? "items-end" : "items-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm sm:max-w-[72%]",
                          message.mine
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md border border-border/70 bg-card text-foreground",
                        )}
                      >
                        <p className="whitespace-pre-line">{message.body}</p>
                      </div>
                      <p className="mt-1 px-1 text-[10px] text-muted-foreground">
                        {formatMessageTime(message.createdAt)}
                        {message.mine ? " · sent" : message.read ? " · read" : ""}
                      </p>
                    </motion.div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border/60 p-3 sm:p-4">
          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }}
              rows={2}
              maxLength={2000}
              placeholder="Write a message… Enter to send, Shift+Enter for a new line"
              className="min-h-[52px] flex-1 resize-none rounded-xl text-sm"
              aria-label="Message"
              disabled={sending}
            />
            <Button
              className="h-[52px] shrink-0 rounded-xl px-4"
              onClick={() => void submit()}
              disabled={sending || draft.trim().length === 0}
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              <span className="hidden sm:inline">Send</span>
            </Button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <ShieldCheck className="size-3" />
            Private between you and {conversation.counterpart.name}. Keep sensitive
            documents inside the official application flow.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
