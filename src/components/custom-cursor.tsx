import { useEffect, useRef } from "react";

/**
 * A quiet desktop cursor: a precise dot plus a trailing ring.
 * Touch devices and reduced-motion users keep the native cursor.
 */
export function CustomCursor() {
  const dotWrap = useRef<HTMLDivElement>(null);
  const ringWrap = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLSpanElement>(null);
  const ring = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!finePointer.matches) return;

    const root = document.documentElement;
    const dotEl = dot.current!;
    const ringEl = ring.current!;
    const dotWrapEl = dotWrap.current!;
    const ringWrapEl = ringWrap.current!;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let targetX = -100;
    let targetY = -100;
    let ringX = -100;
    let ringY = -100;
    let visible = false;
    let textMode = false;

    function show() {
      if (textMode) return;
      root.classList.add("custom-cursor-active");
      if (visible) return;
      visible = true;
      dotEl.classList.add("is-visible");
      ringEl.classList.add("is-visible");
    }

    function hide() {
      visible = false;
      dotEl.classList.remove("is-visible");
      ringEl.classList.remove("is-visible");
    }

    function setTextMode(text: boolean) {
      textMode = text;
      if (text) {
        root.classList.remove("custom-cursor-active");
        hide();
      } else {
        root.classList.add("custom-cursor-active");
      }
    }

    function onOver(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const textField = Boolean(
        target.closest(
          "input:not([type='button']):not([type='submit']):not([type='checkbox']):not([type='radio']), textarea, select, [contenteditable='true']",
        ),
      );
      setTextMode(textField);
      if (textField) return;

      const interactive = Boolean(
        target.closest(
          "a, button, [role='button'], label, summary, [data-cursor='hover']",
        ),
      );
      ringEl.classList.toggle("is-hover", interactive);
      dotEl.classList.toggle("is-hover", interactive);
    }

    function onMove(event: PointerEvent) {
      targetX = event.clientX;
      targetY = event.clientY;
      dotWrapEl.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      if (reduceMotion) {
        ringX = targetX;
        ringY = targetY;
        ringWrapEl.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      }
      if (!textMode) show();
    }

    function onDown() {
      ringEl.classList.add("is-pressed");
    }

    function onUp() {
      ringEl.classList.remove("is-pressed");
    }

    function onLeave() {
      hide();
    }

    function tick() {
      ringX += (targetX - ringX) * 0.18;
      ringY += (targetY - ringY) * 0.18;
      ringWrapEl.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      frame = window.requestAnimationFrame(tick);
    }

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    window.addEventListener("blur", onLeave);
    finePointer.addEventListener("change", onLeave);

    if (!reduceMotion) frame = window.requestAnimationFrame(tick);
    else {
      ringX = targetX;
      ringY = targetY;
    }

    return () => {
      root.classList.remove("custom-cursor-active");
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onLeave);
      finePointer.removeEventListener("change", onLeave);
    };
  }, []);

  return (
    <>
      <div
        ref={dotWrap}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[10000]"
      >
        <span
          ref={dot}
          className="custom-cursor-dot -translate-x-1/2 -translate-y-1/2 rounded-full"
        />
      </div>
      <div
        ref={ringWrap}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[10000]"
      >
        <span
          ref={ring}
          className="custom-cursor-ring -translate-x-1/2 -translate-y-1/2 rounded-full"
        />
      </div>
    </>
  );
}
