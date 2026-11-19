"use client";
import { useEffect, useState } from "react";
import { THEME_COOKIE, themeFromCookie, type Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/** Light / Dark / System. Applies at once and remembers the choice for a year. */
export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    const m = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`));
    setTheme(themeFromCookie(m?.[1]));
  }, []);
  const choose = (t: Theme) => {
    setTheme(t);
    if (t === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
    document.cookie = `${THEME_COOKIE}=${t}; Path=/; Max-Age=31536000; SameSite=Lax`;
  };
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-full border border-border bg-surface-2 p-0.5 text-xs">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={theme === o.value}
          onClick={() => choose(o.value)}
          className={`min-h-7 rounded-full px-2.5 font-semibold ${theme === o.value ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
