import { createContext, useContext } from "react";

export type Theme = "light" | "dark" | "system";
export const THEME_STORAGE_KEY = "spotfinder.theme";
export const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

export function isTheme(value: unknown): value is Theme {
    return value === "light" || value === "dark" || value === "system";
}

export function readTheme(): Theme {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        return isTheme(stored) ? stored : "system";
    } catch {
        return "system";
    }
}

export const ThemeContext = createContext<{
    theme: Theme;
    resolvedTheme: "light" | "dark";
    setTheme: (theme: Theme) => void;
} | null>(null);

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("Theme controls require ThemeProvider");
    return context;
}
