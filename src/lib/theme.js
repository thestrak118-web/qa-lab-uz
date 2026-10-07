export const THEME_KEY = "qa-lab-theme";
export const THEME_OPTIONS = ["system", "light", "dark"];

export function readThemePreference() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return THEME_OPTIONS.includes(value) ? value : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(preference, systemDark) {
  const theme =
    preference === "system" ? (systemDark ? "dark" : "light") : preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#10151d" : "#f7f8fa");
}
