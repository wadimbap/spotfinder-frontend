import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ThemeProvider } from "../src/shared/theme/ThemeProvider";
import { ThemeControl } from "../src/shared/theme/ThemeControl";
import { THEME_STORAGE_KEY } from "../src/shared/theme/theme";

let systemDark = false;
let media: EventTarget;

beforeEach(() => {
    localStorage.clear();
    systemDark = false;
    media = new EventTarget();
    vi.stubGlobal("matchMedia", vi.fn(() => ({
        get matches() { return systemDark; },
        addEventListener: media.addEventListener.bind(media),
        removeEventListener: media.removeEventListener.bind(media),
    })));
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function renderControl() { return render(<ThemeProvider><ThemeControl /></ThemeProvider>); }
function changeSystem(dark: boolean) {
    act(() => { systemDark = dark; media.dispatchEvent(new Event("change")); });
}

it("defaults to system and follows live system changes", () => {
    renderControl();
    expect((screen.getByLabelText("Theme") as HTMLSelectElement).value).toBe("system");
    expect(document.documentElement.dataset.theme).toBe("light");
    changeSystem(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    changeSystem(false);
    expect(document.documentElement.dataset.theme).toBe("light");
});

it("persists manual choice across mounts and ignores OS changes until System is selected", () => {
    const view = renderControl();
    fireEvent.change(screen.getByLabelText("Theme"), { target: { value: "dark" } });
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    changeSystem(true); changeSystem(false);
    expect(document.documentElement.dataset.theme).toBe("dark");
    view.unmount(); renderControl();
    expect((screen.getByLabelText("Theme") as HTMLSelectElement).value).toBe("dark");
    fireEvent.change(screen.getByLabelText("Theme"), { target: { value: "system" } });
    expect(document.documentElement.dataset.theme).toBe("light");
    changeSystem(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
});

it("starts with a saved light choice even on a dark system", () => {
    systemDark = true;
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    renderControl();
    expect(document.documentElement.dataset.theme).toBe("light");
});

it("falls back to system for invalid preferences and synchronizes changes from another tab", () => {
    systemDark = true;
    localStorage.setItem(THEME_STORAGE_KEY, "invalid");
    renderControl();
    expect(document.documentElement.dataset.theme).toBe("dark");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: "light" })));
    expect(document.documentElement.dataset.theme).toBe("light");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: null })));
    expect(document.documentElement.dataset.theme).toBe("dark");
});

it("allows theme switching when storage reads and writes are denied", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); });
    renderControl();
    fireEvent.change(screen.getByLabelText("Theme"), { target: { value: "dark" } });
    expect(document.documentElement.dataset.theme).toBe("dark");
    fireEvent.change(screen.getByLabelText("Theme"), { target: { value: "light" } });
    expect(document.documentElement.dataset.theme).toBe("light");
});
