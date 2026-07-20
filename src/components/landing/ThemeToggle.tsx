import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";
const STORAGE_KEY = "natymd-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "dark";
    setTheme(stored);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      aria-pressed={!isDark}
      className="group relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-card/40 text-muted-foreground backdrop-blur-sm transition-all duration-200 hover:border-brand/60 hover:text-brand"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-px -top-px h-1.5 w-1.5 border-l border-t border-border/70 transition-colors group-hover:border-brand"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-px -bottom-px h-1.5 w-1.5 border-r border-b border-border/70 transition-colors group-hover:border-brand"
      />
      {mounted && isDark ? (
        <Sun size={14} strokeWidth={1.75} />
      ) : (
        <Moon size={14} strokeWidth={1.75} />
      )}
    </button>
  );
}