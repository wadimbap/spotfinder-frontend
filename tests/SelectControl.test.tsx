import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { SelectControl } from "../src/shared/components/SelectControl";

function Harness() {
    const [value, setValue] = useState("skate");
    return <><SelectControl label="Primary activity" value={value} onChange={setValue}
        options={[{ value: "", label: "Not selected" }, { value: "skate", label: "Skateboarding" }, { value: "bmx", label: "BMX" }]} />
        <button>Outside</button></>;
}

it("opens at the current value, supports arrow navigation and commits on Enter", async () => {
    const user = userEvent.setup(); render(<Harness />);
    const trigger = screen.getByRole("combobox", { name: "Primary activity" });
    await user.click(trigger);
    expect(screen.getByRole("option", { name: "Skateboarding" }).getAttribute("aria-selected")).toBe("true");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(trigger.textContent).toBe("BMX");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(trigger);
});

it("cancels keyboard navigation with Escape and closes on an outside click", async () => {
    const user = userEvent.setup(); render(<Harness />);
    const trigger = screen.getByRole("combobox", { name: "Primary activity" });
    await user.click(trigger); await user.keyboard("{Home}{Escape}");
    expect(trigger.textContent).toBe("Skateboarding");
    expect(screen.queryByRole("listbox")).toBeNull();
    await user.click(trigger); await user.click(screen.getByText("Outside"));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(screen.getByText("Outside"));
});

it("clears the activity through Not selected and lets Tab continue to the next control", async () => {
    const user = userEvent.setup(); render(<Harness />);
    const trigger = screen.getByRole("combobox", { name: "Primary activity" });
    await user.click(trigger); await user.click(screen.getByRole("option", { name: "Not selected" }));
    expect(trigger.textContent).toBe("Not selected");
    await user.keyboard("{ArrowDown}{Tab}");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(screen.getByText("Outside"));
});

it("opens upward near the bottom of the viewport", async () => {
    const user = userEvent.setup(); render(<Harness />);
    const trigger = screen.getByRole("combobox", { name: "Primary activity" });
    const bounds = vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(new DOMRect(0, window.innerHeight - 80, 240, 44));
    await user.click(trigger);
    expect(screen.getByRole("listbox").getAttribute("data-placement")).toBe("above");
    bounds.mockRestore();
});
