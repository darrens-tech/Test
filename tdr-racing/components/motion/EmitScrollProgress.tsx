"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ScrollTrigger, SCRUB } from "@/lib/gsap";
import { emitScene, type SceneMessage } from "@/lib/scrollBus";

/** Wraps a scroll region and streams its progress (0..1) to a GL scene. */
export function EmitScrollProgress({
  scene,
  children,
  className,
}: {
  scene: SceneMessage["scene"];
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document.documentElement.dataset.motion !== "full") {
      emitScene({ scene, progress: 1 });
      return;
    }
    const el = ref.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      scrub: SCRUB,
      onUpdate: (self) => emitScene({ scene, progress: self.progress }),
    });
    return () => st.kill();
  }, [scene]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
