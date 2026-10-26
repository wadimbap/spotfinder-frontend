import { useTheme, type Theme } from "./theme";

export function ThemeControl() {
    const { theme, resolvedTheme, setTheme } = useTheme();
    return <label className="theme-control">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            {resolvedTheme === "dark"
                ? <path d="M20.5 14.5A9 9 0 0 1 9.5 3.5a9 9 0 1 0 11 11Z" />
                : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>}
        </svg>
        <span className="sr-only">Theme</span>
        <select value={theme} onChange={(event) => setTheme(event.target.value as Theme)}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>;
}
