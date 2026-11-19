/** Light / dark / follow the system. Stored in a plain cookie so the server renders the right theme without a flash. */
export const THEME_COOKIE = "kw-theme";
export type Theme = "system" | "light" | "dark";
export function themeFromCookie(value: string | undefined): Theme {
  return value === "light" || value === "dark" ? value : "system";
}
