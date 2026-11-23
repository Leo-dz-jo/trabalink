import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * Counts a number up from `startAt` to `value` on mount, and eases from the
 * previous value on later changes. Digits use the numeric face with tabular
 * figures so the width never jumps mid-count. Reduced-motion users and screen
 * readers get the final value immediately.
 */
export function AnimatedNumber({
  value,
  duration = 900,
  decimals = 0,
  startAt = 0,
  className,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  startAt?: number;
  className?: string;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState(() => (reduceMotion ? value : startAt));

  useEffect(() => {
    if (reduceMotion) return;

    const from = display;
    const started = performance.now();
    let frame = 0;

    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    // Frames stop in a backgrounded tab, so a timer guarantees the final value.
    const settle = window.setTimeout(() => setDisplay(value), duration + 150);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
    };
    // `display` is intentionally excluded: it changes on every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, reduceMotion]);

  const shown = reduceMotion ? value : display;
  const formatted =
    decimals > 0 ? shown.toFixed(decimals) : Math.round(shown).toString();

  return (
    <span className={cn("font-numeric tabular-nums", className)}>
      <span aria-hidden="true">{formatted}</span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
