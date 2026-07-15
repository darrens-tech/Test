"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Tier = 1 | 2 | 3;

/**
 * Runs inline in <head>, before paint, so CSS keyed on [data-tier] and
 * [data-motion] never flashes. Synchronous signals only — the 300ms GPU
 * micro-benchmark runs after mount and can demote a provisional Tier 1.
 *
 *   T3  prefers-reduced-motion, or no WebGL2
 *   T2  < 4 cores, < 4GB deviceMemory, or Save-Data
 *   T1  otherwise (provisional until benchmark confirms)
 *
 * ?tier=1|2|3 forces a tier for QA. sessionStorage keeps it sticky.
 */
export const TIER_INIT_SCRIPT = `(function(){try{
var d=document.documentElement,q=new URLSearchParams(location.search).get("tier"),
s=sessionStorage.getItem("tdr-tier"),t=0;
if(q==="1"||q==="2"||q==="3"){t=+q;sessionStorage.setItem("tdr-tier",q);}
else if(s==="1"||s==="2"||s==="3"){t=+s;}
var prm=matchMedia("(prefers-reduced-motion: reduce)").matches;
if(!t){
  var gl=null;try{gl=document.createElement("canvas").getContext("webgl2");}catch(e){}
  var nav=navigator,cores=nav.hardwareConcurrency||4,mem=nav.deviceMemory||4,
  sd=nav.connection&&nav.connection.saveData;
  t=(prm||!gl)?3:(cores<4||mem<4||sd)?2:1;
}
if(prm&&t<3)t=3;
d.dataset.tier=""+t;
d.dataset.motion=(t===3)?"static":"full";
}catch(e){document.documentElement.dataset.tier="3";document.documentElement.dataset.motion="static";}})()`;

const TierContext = createContext<{ tier: Tier; demote: (reason: string) => void }>({
  tier: 3,
  demote: () => {},
});

export function useTier() {
  return useContext(TierContext);
}

function readDomTier(): Tier {
  if (typeof document === "undefined") return 3;
  const t = Number(document.documentElement.dataset.tier);
  return t === 1 || t === 2 || t === 3 ? (t as Tier) : 3;
}

/**
 * 300ms fill-rate micro-benchmark on an offscreen WebGL2 context.
 * Weak GPUs (or software rasterizers) fail to sustain ~40fps of heavy
 * fragment work at 512² and get demoted to Tier 2 before any scene mounts.
 */
function benchGpu(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 512;
      const gl = canvas.getContext("webgl2", { powerPreference: "high-performance" });
      if (!gl) return resolve(false);
      const vs = gl.createShader(gl.VERTEX_SHADER)!;
      gl.shaderSource(vs, `#version 300 es
        void main(){vec2 p=vec2(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.);gl_Position=vec4(p,0.,1.);}`);
      gl.compileShader(vs);
      const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(fs, `#version 300 es
        precision highp float;out vec4 o;
        void main(){float a=0.;for(int i=0;i<160;i++){a+=sin(gl_FragCoord.x*.01+float(i))*cos(gl_FragCoord.y*.01);}o=vec4(vec3(a*.001+.5),1.);}`);
      gl.compileShader(fs);
      const prog = gl.createProgram()!;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return resolve(false);
      gl.useProgram(prog);
      let frames = 0;
      const start = performance.now();
      const tick = () => {
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.flush();
        frames++;
        if (performance.now() - start < 300) requestAnimationFrame(tick);
        else {
          const lost = gl.getExtension("WEBGL_lose_context");
          lost?.loseContext();
          resolve(frames >= 12); // ≥ ~40fps under load
        }
      };
      requestAnimationFrame(tick);
    } catch {
      resolve(false);
    }
  });
}

export function TierProvider({ children }: { children: ReactNode }) {
  // Initial state must match SSR (Tier 3) — the real tier is adopted in an
  // effect, so the first client render is hydration-identical to the server.
  const [tier, setTier] = useState<Tier>(3);
  const [toast, setToast] = useState<string | null>(null);

  const apply = useCallback((t: Tier) => {
    document.documentElement.dataset.tier = String(t);
    document.documentElement.dataset.motion = t === 3 ? "static" : "full";
    sessionStorage.setItem("tdr-tier", String(t));
    setTier(t);
  }, []);

  const demote = useCallback(
    (reason: string) => {
      const next = (readDomTier() === 1 ? 2 : 3) as Tier;
      apply(next);
      setToast(`render tier → ${next === 2 ? "motion" : "still"} · ${reason}`);
      window.setTimeout(() => setToast(null), 4000);
    },
    [apply],
  );

  useEffect(() => {
    // Self-healing: if React recovered from a hydration error it re-rendered
    // <html> with the SSR attributes (tier 3), clobbering the init script's
    // work. Recompute the truth (session first, then sync signals) and stamp
    // it back — apply() is idempotent.
    const stored = Number(sessionStorage.getItem("tdr-tier"));
    let desired: Tier;
    if (stored === 1 || stored === 2 || stored === 3) desired = stored as Tier;
    else {
      const prm = matchMedia("(prefers-reduced-motion: reduce)").matches;
      let gl: WebGL2RenderingContext | null = null;
      try {
        gl = document.createElement("canvas").getContext("webgl2");
      } catch {}
      const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
      desired =
        prm || !gl
          ? 3
          : (nav.hardwareConcurrency ?? 4) < 4 || (nav.deviceMemory ?? 4) < 4 || nav.connection?.saveData
            ? 2
            : 1;
    }
    if (desired !== readDomTier()) apply(desired);
    else setTier(desired);

    // Confirm a provisional Tier 1 with the GPU benchmark — once per session.
    if (readDomTier() === 1 && !sessionStorage.getItem("tdr-bench")) {
      benchGpu().then((ok) => {
        sessionStorage.setItem("tdr-bench", "1");
        if (!ok) {
          apply(2);
        }
      });
    }
  }, [apply]);

  return (
    <TierContext.Provider value={{ tier, demote }}>
      {children}
      {toast && (
        <output className="toast" aria-live="polite">
          {toast}
        </output>
      )}
    </TierContext.Provider>
  );
}
