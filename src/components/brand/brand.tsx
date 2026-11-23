import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router";
import logoLight from "@/assets/logo-mark-light.png";
import logoDark from "@/assets/logo-mark-dark.png";
import { cn } from "@/lib/utils";

/**
 * Brand mark: navy tile in light mode, gold tile in dark mode. The artwork is
 * the same document-plus-necktie symbol from the Trabajalink identity.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex size-9 shrink-0", className)}
    >
      <img
        src={logoLight}
        alt=""
        className="size-full rounded-[22%] object-contain dark:hidden"
      />
      <img
        src={logoDark}
        alt=""
        className="hidden size-full rounded-[22%] object-contain dark:block"
      />
    </span>
  );
}

/**
 * The trabalink wordmark. Letters settle in one by one, the gradient sweeps
 * slowly, and the trailing dot breathes. Motion is disabled for users who ask
 * for reduced motion.
 */
export function AnimatedWordmark({
  className,
  delay = 0,
  dot = true,
  animate = true,
  tone = "default",
}: {
  className?: string;
  delay?: number;
  dot?: boolean;
  animate?: boolean;
  /** Use "onPrimary" on the theme primary, or "onNavy" on a fixed dark panel. */
  tone?: "default" | "onPrimary" | "onNavy";
}) {
  const reduceMotion = useReducedMotion();
  const letters = "TRABALINK".split("");
  const shouldAnimate = animate && !reduceMotion;

  return (
    <span
      className={cn(
        "inline-flex items-baseline font-display font-extrabold tracking-[-0.025em] leading-none",
        className,
      )}
      aria-label="Trabalink"
    >
      {letters.map((letter, index) => (
        <motion.span
          key={`${letter}-${index}`}
          aria-hidden="true"
          initial={
            shouldAnimate ? { opacity: 0, y: 10, filter: "blur(6px)" } : false
          }
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={
            shouldAnimate
              ? {
                  delay: delay + index * 0.045,
                  duration: 0.55,
                  ease: [0.22, 1, 0.36, 1],
                }
              : { duration: 0 }
          }
          className={
            tone === "onNavy"
              ? "text-white"
              : tone === "onPrimary"
                ? "text-primary-foreground"
                : "brand-gradient-text"
          }
        >
          {letter}
        </motion.span>
      ))}
      {dot && (
        <motion.span
          aria-hidden="true"
          initial={shouldAnimate ? { scale: 0, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: delay + 0.5,
            type: "spring",
            stiffness: 320,
            damping: 18,
          }}
          className={cn(
            "relative ml-[0.06em] inline-block size-[0.14em] rounded-full",
            tone === "onNavy"
              ? "bg-white"
              : tone === "onPrimary"
                ? "bg-primary-foreground"
                : "bg-primary",
          )}
        >
          {shouldAnimate && (
            <motion.span
              className={cn(
                "absolute inset-0 rounded-full",
                tone === "onNavy"
                  ? "bg-white"
                  : tone === "onPrimary"
                    ? "bg-primary-foreground"
                    : "bg-primary",
              )}
              animate={{ scale: [1, 2.1], opacity: [0.45, 0] }}
              transition={{ repeat: Infinity, duration: 2.6, ease: "easeOut" }}
            />
          )}
        </motion.span>
      )}
    </span>
  );
}

export function BrandLockup({
  to = "/",
  size = "md",
  animate = false,
  className,
}: {
  to?: string;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  className?: string;
}) {
  const markSize =
    size === "lg" ? "size-11" : size === "sm" ? "size-7" : "size-9";
  const textSize =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";

  return (
    <Link
      to={to}
      className={cn(
        "group inline-flex min-h-10 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      aria-label="Trabalink home"
    >
      <LogoMark
        className={cn(
          markSize,
          "transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105",
        )}
      />
      {/* Below 360px the mark carries the brand alone, so the header's 40px
          action targets never overflow a narrow phone. */}
      <AnimatedWordmark
        className={cn(textSize, "hidden text-foreground min-[360px]:inline-flex")}
        animate={animate}
        delay={0.08}
      />
    </Link>
  );
}
