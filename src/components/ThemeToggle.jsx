import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { applyTheme, readThemePreference, THEME_KEY } from "../lib/theme.js";

export default function ThemeToggle() {
  const [preference, setPreference] = useState(readThemePreference);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyTheme(preference, media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [preference]);

  useEffect(() => {
    const sync = (event) => {
      if (event.key === THEME_KEY || event.key === null)
        setPreference(readThemePreference());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const change = (event) => {
    const next = event.target.value;
    // A blocked storage area must not prevent changing the current page theme.
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* Session-only preference. */
    }
    setPreference(next);
  };
  const Icon =
    preference === "dark" ? Moon : preference === "light" ? Sun : Monitor;
  return (
    <label
      className="theme-toggle"
      title="Kunduzgi, tungi yoki tizimga mos ko‘rinish"
    >
      <Icon size={15} aria-hidden="true" />
      <span className="theme-label">Rang rejimi</span>
      <select aria-label="Rang rejimi" value={preference} onChange={change}>
        <option value="system">Tizimga mos</option>
        <option value="light">Kunduzgi</option>
        <option value="dark">Tungi</option>
      </select>
    </label>
  );
}
