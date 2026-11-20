import type { Palette } from "@/lib/sites/types";

/** Palettes for app templates. Accents keep at least 4.5:1 against onAccent and against bg for text. */
export const PAL = {
  navy: { bg: "#f6f7fa", surface: "#ffffff", ink: "#111a33", muted: "#566079", accent: "#1d4ed8", accent2: "#0e9f9a", soft: "#e7edfc", line: "#e1e5ee", onAccent: "#ffffff" },
  violet: { bg: "#fafafc", surface: "#ffffff", ink: "#16142b", muted: "#5d5b76", accent: "#6236e0", accent2: "#e0598b", soft: "#efeafe", line: "#e8e6f1", onAccent: "#ffffff" },
  teal: { bg: "#f5f9f9", surface: "#ffffff", ink: "#0d2626", muted: "#4d6565", accent: "#0b7069", accent2: "#3b82f6", soft: "#e0f1ef", line: "#dbe7e6", onAccent: "#ffffff" },
  green: { bg: "#f7faf8", surface: "#ffffff", ink: "#0b2b22", muted: "#4f675f", accent: "#0b6e4f", accent2: "#b8860b", soft: "#e2f1ea", line: "#d9e6e0", onAccent: "#ffffff" },
  ink: { bg: "#f4f4f2", surface: "#ffffff", ink: "#141414", muted: "#5f5f5a", accent: "#141414", accent2: "#c2410c", soft: "#ecebe6", line: "#e2e1dc", onAccent: "#ffffff" },
  terracotta: { bg: "#fbf7f2", surface: "#ffffff", ink: "#2a1a12", muted: "#6e5a4e", accent: "#b4441c", accent2: "#5b7a3a", soft: "#f6e6da", line: "#eadfd4", onAccent: "#ffffff" },
  rose: { bg: "#fdf8f8", surface: "#ffffff", ink: "#2b1520", muted: "#6c5560", accent: "#be185d", accent2: "#7c3aed", soft: "#fbe7ef", line: "#f0e1e6", onAccent: "#ffffff" },
  sky: { bg: "#f5f9fd", surface: "#ffffff", ink: "#0f2238", muted: "#51647a", accent: "#0369a1", accent2: "#16a34a", soft: "#e0effa", line: "#dce6f0", onAccent: "#ffffff" },
  amber: { bg: "#fcfaf5", surface: "#ffffff", ink: "#24190a", muted: "#6b5d48", accent: "#a14a00", accent2: "#1e40af", soft: "#f8ecd9", line: "#ece3d3", onAccent: "#ffffff" },
  night: { bg: "#0d1117", surface: "#161b24", ink: "#e8ecf3", muted: "#9aa4b5", accent: "#7c9cff", accent2: "#34d399", soft: "#1f2a44", line: "#283041", onAccent: "#0d1117" },
} satisfies Record<string, Palette>;
