import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function TagInput({
  value,
  onChange,
  placeholder = "Type a skill and press Enter",
  max = 40,
  suggestions = [],
  id,
  ariaLabel = "Skills",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  max?: number;
  suggestions?: string[];
  id?: string;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const candidates = raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (candidates.length === 0) return;
    const next = [...value];
    for (const candidate of candidates) {
      if (next.length >= max) break;
      if (!next.some((item) => item.toLowerCase() === candidate.toLowerCase())) {
        next.push(candidate.slice(0, 60));
      }
    }
    onChange(next);
    setDraft("");
  }

  function remove(skill: string) {
    onChange(value.filter((item) => item !== skill));
  }

  const unusedSuggestions = suggestions
    .filter((suggestion) => !value.some((item) => item.toLowerCase() === suggestion.toLowerCase()))
    .slice(0, 6);

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              add(draft);
            }
            if (event.key === "Backspace" && !draft && value.length > 0) {
              remove(value[value.length - 1]);
            }
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="h-11"
        />
        <button
          type="button"
          onClick={() => add(draft)}
          disabled={!draft.trim() || value.length >= max}
          aria-label="Add skill"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-secondary-foreground transition-colors hover:bg-accent disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-accent py-1 pl-2.5 pr-1 text-xs font-medium text-accent-foreground"
            >
              {skill}
              <button
                type="button"
                onClick={() => remove(skill)}
                className="flex size-5 items-center justify-center rounded-full transition-colors hover:bg-primary/10"
                aria-label={`Remove ${skill}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Quick add:</span>
          {unusedSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => add(suggestion)}
              className={cn(
                "rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary",
              )}
            >
              + {suggestion}
            </button>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        {value.length}/{max} skills · press Enter or comma to add
      </p>
    </div>
  );
}
