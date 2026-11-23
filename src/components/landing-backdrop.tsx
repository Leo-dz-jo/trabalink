import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  radius: number;
};

/**
 * A quiet, living backdrop: slow particles linked by fine lines, with a soft
 * light that follows the pointer. It is fixed behind the landing page and
 * respects reduced-motion preferences.
 */
export function LandingBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx = context;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let particles: Particle[] = [];
    let palette = paletteFor();

    const pointer = { x: -1000, y: -1000, active: false };

    function paletteFor() {
      const dark = document.documentElement.classList.contains("dark");
      return dark
        ? {
            dot: "rgba(231, 192, 90, 0.48)",
            line: "137, 177, 204",
            glow: "rgba(231, 192, 90, 0.11)",
            glowFade: "rgba(231, 192, 90, 0)",
            orbA: "rgba(37, 91, 132, 0.38)",
            orbB: "rgba(231, 192, 90, 0.16)",
            orbFadeA: "rgba(37, 91, 132, 0)",
            orbFadeB: "rgba(231, 192, 90, 0)",
          }
        : {
            dot: "rgba(21, 58, 91, 0.5)",
            line: "21, 58, 91",
            glow: "rgba(199, 154, 34, 0.17)",
            glowFade: "rgba(199, 154, 34, 0)",
            orbA: "rgba(21, 58, 91, 0.16)",
            orbB: "rgba(199, 154, 34, 0.18)",
            orbFadeA: "rgba(21, 58, 91, 0)",
            orbFadeB: "rgba(199, 154, 34, 0)",
          };
    }

    let clock = 0;

    function buildParticles() {
      const count = Math.min(
        84,
        Math.max(38, Math.round((width * height) / 24_000)),
      );
      particles = Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.06 + Math.random() * 0.1;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          baseVx: Math.cos(angle) * speed,
          baseVy: Math.sin(angle) * speed,
          radius: 0.9 + Math.random() * 1.3,
        };
      });
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      // Slow atmospheric orbs keep the page feeling alive even before the
      // pointer enters. Their movement is intentionally almost imperceptible.
      const firstOrbX = width * (0.16 + Math.sin(clock * 0.00022) * 0.05);
      const firstOrbY = height * (0.22 + Math.cos(clock * 0.00018) * 0.05);
      const orbA = ctx.createRadialGradient(
        firstOrbX,
        firstOrbY,
        0,
        firstOrbX,
        firstOrbY,
        Math.max(width, height) * 0.4,
      );
      orbA.addColorStop(0, palette.orbA);
      orbA.addColorStop(1, palette.orbFadeA);
      ctx.fillStyle = orbA;
      ctx.fillRect(0, 0, width, height);

      const secondOrbX = width * (0.86 + Math.cos(clock * 0.0002) * 0.06);
      const secondOrbY = height * (0.08 + Math.sin(clock * 0.00024) * 0.05);
      const orbB = ctx.createRadialGradient(
        secondOrbX,
        secondOrbY,
        0,
        secondOrbX,
        secondOrbY,
        Math.max(width, height) * 0.32,
      );
      orbB.addColorStop(0, palette.orbB);
      orbB.addColorStop(1, palette.orbFadeB);
      ctx.fillStyle = orbB;
      ctx.fillRect(0, 0, width, height);

      if (pointer.active) {
        const glow = ctx.createRadialGradient(
          pointer.x,
          pointer.y,
          0,
          pointer.x,
          pointer.y,
          280,
        );
        glow.addColorStop(0, palette.glow);
        glow.addColorStop(1, palette.glowFade);
        ctx.fillStyle = glow;
        ctx.fillRect(pointer.x - 280, pointer.y - 280, 560, 560);
      }

      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared > 15_500) continue;
          const alpha = (1 - distanceSquared / 15_500) * 0.24;
          ctx.strokeStyle = `rgba(${palette.line}, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      ctx.fillStyle = palette.dot;
      for (const particle of particles) {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (pointer.active) {
        ctx.strokeStyle = `rgba(${palette.line}, 0.16)`;
        ctx.lineWidth = 1;
        for (const particle of particles) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance > 210) continue;
          ctx.globalAlpha = 1 - distance / 210;
          ctx.beginPath();
          ctx.moveTo(pointer.x, pointer.y);
          ctx.lineTo(particle.x, particle.y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }

    function step() {
      clock += 16;
      for (const particle of particles) {
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (pointer.active && distance < 170 && distance > 0.001) {
          const force = (1 - distance / 170) * 0.05;
          particle.vx += (dx / distance) * force;
          particle.vy += (dy / distance) * force;
        }

        particle.vx += (particle.baseVx - particle.vx) * 0.02;
        particle.vy += (particle.baseVy - particle.vy) * 0.02;
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -10) particle.x = width + 10;
        if (particle.x > width + 10) particle.x = -10;
        if (particle.y < -10) particle.y = height + 10;
        if (particle.y > height + 10) particle.y = -10;
      }
      draw();
      frame = window.requestAnimationFrame(step);
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildParticles();
      draw();
    }

    function onPointerMove(event: PointerEvent) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
      if (reduceMotion) draw();
    }

    function onPointerLeave() {
      pointer.active = false;
      if (reduceMotion) draw();
    }

    function onVisibilityChange() {
      if (document.hidden) {
        window.cancelAnimationFrame(frame);
      } else if (!reduceMotion) {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(step);
      }
    }

    const themeObserver = new MutationObserver(() => {
      palette = paletteFor();
      if (reduceMotion) draw();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    resize();
    if (!reduceMotion) frame = window.requestAnimationFrame(step);

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.cancelAnimationFrame(frame);
      themeObserver.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full opacity-100"
    />
  );
}
