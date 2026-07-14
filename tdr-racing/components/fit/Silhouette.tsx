/**
 * Cyan wireframe scooter silhouette for /fit — 2D SVG so it ships identically
 * on every tier. Fitment zones pulse when the selected bike has matched parts
 * in that system. Pure CSS animation; still on reduced motion.
 */
const ZONES: Record<string, { cx: number; cy: number; r: number; label: string }> = {
  engine: { cx: 235, cy: 168, r: 26, label: "Engine" },
  cvt: { cx: 272, cy: 176, r: 22, label: "CVT" },
  exhaust: { cx: 300, cy: 190, r: 16, label: "Exhaust" },
  electrical: { cx: 205, cy: 120, r: 16, label: "Electrical" },
  "front-wheel": { cx: 90, cy: 186, r: 30, label: "Front wheel / brake" },
  "rear-wheel": { cx: 310, cy: 186, r: 30, label: "Rear wheel / brake" },
  suspension: { cx: 288, cy: 140, r: 18, label: "Suspension" },
  handlebar: { cx: 128, cy: 62, r: 18, label: "Handlebar" },
  body: { cx: 170, cy: 130, r: 24, label: "Body" },
};

export function Silhouette({ activeZones }: { activeZones: string[] }) {
  return (
    <svg
      viewBox="0 0 400 240"
      className="h-auto w-full"
      role="img"
      aria-label={`Fitment zones: ${activeZones.length ? activeZones.join(", ") : "none selected"}`}
    >
      <g stroke="var(--hud-25)" strokeWidth="1.5" fill="none">
        {/* wheels */}
        <circle cx="90" cy="186" r="36" />
        <circle cx="90" cy="186" r="14" />
        <circle cx="310" cy="186" r="36" />
        <circle cx="310" cy="186" r="14" />
        {/* fork + bar */}
        <path d="M90 186 L118 80 M108 62 L148 58 M118 80 L112 68" />
        {/* body silhouette */}
        <path d="M118 84 C140 100 150 118 148 132 L196 140 C216 118 258 128 268 150 L286 152 C296 158 300 168 296 176 L262 186 C250 160 216 154 200 162 L156 156 C140 156 120 168 118 178 L104 178" />
        {/* floorboard + seat */}
        <path d="M150 148 L196 152 M188 118 C214 104 258 106 276 118 L282 138" />
        {/* rear shock */}
        <path d="M286 152 L296 132" stroke="var(--color-redline)" strokeOpacity="0.6" />
      </g>
      {Object.entries(ZONES).map(([id, z]) => {
        const active = activeZones.includes(id);
        return (
          <g key={id}>
            <circle
              cx={z.cx}
              cy={z.cy}
              r={z.r}
              fill={active ? "var(--hud-08)" : "none"}
              stroke={active ? "var(--color-hud)" : "var(--tick)"}
              strokeWidth={active ? 1.5 : 0.75}
              strokeDasharray={active ? "none" : "3 4"}
              className={active ? "fit-zone-active" : undefined}
            >
              <title>{z.label}</title>
            </circle>
            {active && (
              <circle cx={z.cx} cy={z.cy} r={3} fill="var(--color-hud)" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function zonesForPillarSub(pillar: string, sub: string): string[] {
  switch (sub) {
    case "engine":
      return ["engine"];
    case "electrical":
      return ["electrical"];
    case "clutch-transmission-cvt":
      return ["cvt"];
    case "induction-exhaust":
      return ["exhaust"];
    case "suspension-chassis":
      return ["suspension", "handlebar"];
    case "wheel":
      return ["front-wheel", "rear-wheel"];
    case "brake":
      return ["front-wheel", "rear-wheel"];
    case "body":
      return ["body"];
    default:
      return pillar === "maintenance" ? ["engine", "cvt"] : [];
  }
}
