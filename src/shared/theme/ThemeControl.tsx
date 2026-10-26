import { SelectControl } from "../components/SelectControl";
import { useTheme } from "./theme";

export function ThemeControl() {
    const { theme, resolvedTheme, setTheme } = useTheme();
    return <SelectControl label="Theme" value={theme} onChange={setTheme} className="theme-control"
        options={[{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
        icon={<svg className="theme-symbol" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            {resolvedTheme === "dark"
                ? <path d="M20.5 14.5A9 9 0 0 1 9.5 3.5a9 9 0 1 0 11 11Z" />
                : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>}
        </svg>} />;
}
