import { motion } from "framer-motion";
import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "react-router";
import { AnimatedWordmark, BrandLockup } from "@/components/brand/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 shell-grid opacity-60" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full accent-glow"
        aria-hidden="true"
      />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <BrandLockup size="sm" animate />
        <Button asChild variant="ghost" size="sm" className="h-10 rounded-lg">
          <Link to="/">
            <ArrowLeft className="size-4" /> Home
          </Link>
        </Button>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-lg text-center"
        >
          <p className="font-display text-[88px] font-extrabold leading-none tracking-[-0.06em] text-primary sm:text-[120px]">
            404
          </p>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">
            This page didn&apos;t make the shortlist.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The link may be outdated, or the page moved. Head back to{" "}
            <AnimatedWordmark className="text-[1.05em] text-foreground" /> and pick up
            where you left off.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button asChild className="h-11 rounded-xl px-5">
              <Link to="/">
                <ArrowLeft className="size-4" /> Back to home
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-xl px-5">
              <Link to="/app/jobs">
                <Compass className="size-4" /> Browse jobs
              </Link>
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
