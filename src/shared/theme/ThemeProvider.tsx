import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { DARK_SCHEME_QUERY, isTheme, readTheme, THEME_STORAGE_KEY, ThemeContext, type Theme } from "./theme";

function subscribeSystemTheme(onChange: () => void) {
    const media = window.matchMedia?.(DARK_SCHEME_QUERY);
    media?.addEventListener("change", onChange);
    return () => media?.removeEventListener("change", onChange);
}

function getSystemDark() {
    return window.matchMedia?.(DARK_SCHEME_QUERY).matches ?? false;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setPreference] = useState<Theme>(readTheme);
    const systemDark = useSyncExternalStore(subscribeSystemTheme, getSystemDark, () => false);
    const resolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

    useEffect(() => {
        document.documentElement.dataset.theme = resolvedTheme;
        document.documentElement.style.colorScheme = resolvedTheme;
    }, [resolvedTheme]);

    useEffect(() => {
        function onStorage(event: StorageEvent) {
            if (event.key === THEME_STORAGE_KEY || event.key === null) {
                setPreference(isTheme(event.newValue) ? event.newValue : "system");
            }
        }
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    function setTheme(next: Theme) {
        setPreference(next);
        try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* The choice still works for this visit. */ }
    }

    return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>;
}
