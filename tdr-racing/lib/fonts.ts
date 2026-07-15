import localFont from "next/font/local";

/** Self-hosted (public/fonts, sourced from @fontsource) — no third-party origins. */
export const spaceGrotesk = localFont({
  src: [
    { path: "../public/fonts/space-grotesk-latin-500-normal.woff2", weight: "500" },
    { path: "../public/fonts/space-grotesk-latin-600-normal.woff2", weight: "600" },
    { path: "../public/fonts/space-grotesk-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-space-grotesk",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const inter = localFont({
  src: [
    { path: "../public/fonts/inter-latin-400-normal.woff2", weight: "400" },
    { path: "../public/fonts/inter-latin-500-normal.woff2", weight: "500" },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const jetbrainsMono = localFont({
  src: [
    { path: "../public/fonts/jetbrains-mono-latin-400-normal.woff2", weight: "400" },
    { path: "../public/fonts/jetbrains-mono-latin-500-normal.woff2", weight: "500" },
  ],
  variable: "--font-jetbrains",
  display: "swap",
  // not preloaded: HUD micro-labels can swap late; keeps ~43KB off the
  // critical path so the display font (the LCP headline) lands sooner
  preload: false,
  fallback: ["ui-monospace", "monospace"],
});
