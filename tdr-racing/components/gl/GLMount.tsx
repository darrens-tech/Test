"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useTier } from "@/lib/tier";

const GLRoot = dynamic(() => import("./GLRoot"), { ssr: false });

/** Is this a PDP route? Its inline exploded viewport owns the GPU there. */
function isPdp(pathname: string) {
  const p = pathname.replace(/^\/id(?=\/|$)/, "") || "/";
  return /^\/products\/[^/]+\/[^/]+\/[^/]+$/.test(p);
}

/**
 * Mounts the persistent background canvas on Tier 1 only. Three.js and every
 * scene live in this dynamic chunk — zero bytes of it load on Tier 2/3, and
 * none of it blocks the initial route JS (<300KB gate, brief §10).
 */
export function GLMount() {
  const { tier, demote } = useTier();
  const pathname = usePathname();

  if (tier !== 1 || isPdp(pathname)) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <GLRoot onDemote={demote} />
    </div>
  );
}
