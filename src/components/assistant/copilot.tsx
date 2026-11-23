import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Bot,
  CloudOff,
  CornerDownLeft,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useViewer } from "@/hooks/use-viewer";
import {
  isLocalIntent,
  localCopilotReply,
  type CopilotLink,
} from "@/lib/copilot-local";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  highlights?: string[];
  links?: CopilotLink[];
  local?: boolean;
};

const PROMPTS: Record<string, string[]> = {
  applicant: [
    "Which open role fits me best?",
    "What should I improve?",
    "Status of my applications",
    "Any unread replies?",
  ],
  employer: [
    "Summarize my pipeline",
    "Who needs a follow-up?",
    "How do my job posts look?",
    "Any unread messages?",
  ],
  admin: [
    "Give me a moderation overview",
    "What should I review first?",
    "How many accounts are suspended?",
  ],
};

/** Answers that never need the workspace, so they are instant. */
const OFFLINE_PROMPTS = [
  "How does scoring work?",
  "Help me improve my resume",
  "How do interviews work?",
  "Who can see my data?",
];

const REPLY_TIMEOUT_MS = 12_000;

function subscribeToConnection(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function useOnline() {
  return useSyncExternalStore(
    subscribeToConnection,
    () => navigator.onLine,
    () => true,
  );
}

function greetingFor(role: string, firstName: string): Message {
  const intro =
    role === "employer"
      ? "I can brief your pipeline, surface candidates with dated conditions, flag unread threads, or review how your roles are structured."
      : role === "admin"
        ? "I can summarize account and job-post activity, flag suspended accounts, and point you to the records that need attention."
        : "I can rank open roles against your evidence, explain why a role fits, name the gaps worth fixing, check application status, and catch unread replies.";
  return {
    id: `welcome-${role}`,
    role: "assistant",
    text: `I'm your workspace copilot, ${firstName}. ${intro} I run on this app with no paid model, and I keep answering the general questions even without a connection.`,
  };
}

export function Copilot({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { viewer } = useViewer();
  const convex = useConvex();
  const navigate = useNavigate();
  const online = useOnline();

  const role = viewer?.user.role ?? "applicant";
  const firstName =
    role === "employer"
      ? (viewer?.employer?.companyName ?? viewer?.user.name ?? "there")
      : (viewer?.applicant?.fullName?.split(" ")[0] ??
        viewer?.user.name?.split(" ")[0] ??
        "there");

  const [messages, setMessages] = useState<Message[]>(() => [
    greetingFor(role, firstName),
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sequence = useRef(0);

  /** Monotonic id, so messages key stably without reading the clock. */
  function nextId(prefix: string) {
    sequence.current += 1;
    return `${prefix}-${sequence.current}`;
  }

  function scrollToEnd() {
    const element = scrollRef.current;
    if (element) element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }

  function push(message: Message) {
    setMessages((previous) => [...previous, message]);
  }

  async function ask(value: string) {
    const text = value.trim();
    if (!text || busy) return;

    push({ id: nextId("user"), role: "user", text });
    setInput("");
    requestAnimationFrame(scrollToEnd);

    // Greetings and capability questions are answered in the browser.
    if (isLocalIntent(text)) {
      const reply = localCopilotReply({ prompt: text, role, firstName });
      push({
        id: nextId("assistant"),
        role: "assistant",
        text: reply.answer,
        highlights: reply.highlights,
        links: reply.links,
        local: true,
      });
      requestAnimationFrame(scrollToEnd);
      return;
    }

    if (!online) {
      const reply = localCopilotReply({
        prompt: text,
        role,
        firstName,
        mode: "offline",
      });
      push({
        id: nextId("assistant"),
        role: "assistant",
        text: reply.answer,
        highlights: reply.highlights,
        links: reply.links,
        local: true,
      });
      requestAnimationFrame(scrollToEnd);
      return;
    }

    setBusy(true);
    try {
      const timer = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Assistant request timed out")), REPLY_TIMEOUT_MS);
      });
      const reply = (await Promise.race([
        convex.query(api.assistant.ask, { prompt: text }),
        timer,
      ])) as { answer: string; highlights: string[]; links: CopilotLink[] };

      push({
        id: nextId("assistant"),
        role: "assistant",
        text: reply.answer,
        highlights: reply.highlights,
        links: reply.links,
      });
    } catch {
      const reply = localCopilotReply({
        prompt: text,
        role,
        firstName,
        mode: "error",
      });
      push({
        id: nextId("assistant"),
        role: "assistant",
        text: reply.answer,
        highlights: reply.highlights,
        links: reply.links,
        local: true,
      });
    } finally {
      setBusy(false);
      requestAnimationFrame(scrollToEnd);
    }
  }

  function reset() {
    setMessages([greetingFor(role, firstName)]);
    setInput("");
    setBusy(false);
  }

  const prompts = (online ? PROMPTS[role] : OFFLINE_PROMPTS) ?? PROMPTS.applicant;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden border-l-border/60 bg-background p-0 sm:max-w-[480px] sm:rounded-l-[2rem]"
      >
        <SheetHeader className="relative overflow-hidden border-b border-border/60 p-5 pr-14 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div
            className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full bg-gold/15 blur-2xl"
            aria-hidden="true"
          />
          <div className="flex items-center gap-3">
            <span className="relative flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <Bot className="size-5" />
              <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-gold ring-2 ring-card" />
            </span>
            <div>
              <SheetTitle className="font-display text-base font-extrabold tracking-[-0.02em]">
                TRABALINK Copilot
              </SheetTitle>
              <SheetDescription className="flex items-center gap-1.5 text-[11px]">
                {online ? (
                  <>
                    <Sparkles className="size-3 text-gold" /> Grounded in your live workspace
                  </>
                ) : (
                  <>
                    <CloudOff className="size-3 text-conditional" /> Offline — built-in answers
                  </>
                )}
              </SheetDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={reset}
            className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-gold/50 hover:text-foreground"
          >
            <RotateCcw className="size-3" /> New conversation
          </button>
        </SheetHeader>

        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5"
          aria-live="polite"
        >
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {message.role === "user" ? (
                  <div className="max-w-[88%] break-words rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-[13px] leading-relaxed text-primary-foreground shadow-[0_10px_28px_-18px_rgba(21,58,91,0.8)]">
                    {message.text}
                  </div>
                ) : (
                  <div className="max-w-[94%] rounded-2xl rounded-tl-md border border-border/70 bg-card p-3.5 card-shadow">
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      <Sparkles className="size-3 text-gold" /> Copilot
                      {message.local && (
                        <span className="rounded-full border border-border/70 px-1.5 py-0.5 text-[9px] tracking-normal">
                          local
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 break-words text-[13px] leading-relaxed text-foreground/90">
                      {message.text.split("\n\n").map((paragraph, index) => (
                        <p key={`${message.id}-p${index}`}>{paragraph}</p>
                      ))}
                    </div>

                    {message.highlights && message.highlights.length > 0 && (
                      <ul className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
                        {message.highlights.map((highlight) => (
                          <li
                            key={highlight}
                            className="flex items-start gap-2 break-words text-[12px] leading-relaxed text-muted-foreground"
                          >
                            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold" />
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {message.links && message.links.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {message.links.map((link) => (
                          <button
                            key={link.label}
                            type="button"
                            onClick={() => {
                              navigate(link.to);
                              onOpenChange(false);
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:border-gold/50 hover:text-gold"
                          >
                            {link.label}
                            <ArrowUpRight className="size-3" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {busy && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-border/70 bg-card p-3.5 text-xs text-muted-foreground"
            >
              <span className="flex size-7 items-center justify-center rounded-lg bg-gold-soft text-gold">
                <Sparkles className="size-3.5" />
              </span>
              <span className="flex gap-1">
                {[0, 1, 2].map((index) => (
                  <motion.span
                    key={index}
                    className="size-1.5 rounded-full bg-gold"
                    animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      delay: index * 0.14,
                    }}
                  />
                ))}
              </span>
              Reading your workspace…
            </motion.div>
          )}
        </div>

        <div className="border-t border-border/60 bg-card/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
          <div className="no-scrollbar mb-2.5 flex gap-1.5 overflow-x-auto">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={busy}
                onClick={() => void ask(prompt)}
                className="shrink-0 rounded-full border border-border/70 bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-gold/50 hover:text-foreground disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="relative rounded-2xl border border-border/80 bg-background p-1.5 focus-within:border-gold/60 focus-within:ring-2 focus-within:ring-gold/15">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void ask(input);
                }
              }}
              rows={2}
              maxLength={600}
              placeholder={
                online
                  ? "Ask about matches, gaps, pipeline, or next steps…"
                  : "Ask about scoring, resumes, or interviews…"
              }
              className="min-h-[56px] resize-none border-0 bg-transparent px-2.5 py-2 text-[13px] shadow-none focus-visible:ring-0"
              disabled={busy}
              aria-label="Message TRABALINK Copilot"
            />
            <div className="flex items-center justify-between px-2 pb-1">
              <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <CornerDownLeft className="size-3" /> Enter to send · Shift + Enter for a
                new line
              </p>
              <Button
                type="button"
                size="icon"
                className="size-8 rounded-xl"
                disabled={!input.trim() || busy}
                onClick={() => void ask(input)}
                aria-label="Send message"
              >
                <Send className="size-3.5" />
              </Button>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
            No paid model: answers are computed from your workspace. A human makes every
            hiring decision.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
