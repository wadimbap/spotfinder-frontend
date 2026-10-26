import { useCallback, useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { PhotoViewer } from "../src/features/spots/PhotoViewer";
import { SpotDialog } from "../src/features/spots/SpotDialog";

const photos = [{ id: "first", url: "blob:first", alt: "First photo" }, { id: "second", url: "blob:second", alt: "Second photo" }];
function Harness({ onCardClose }: { onCardClose: () => void }) {
    const [selected, setSelected] = useState<string | null>(null);
    const close = useCallback(() => setSelected(null), []);
    return <SpotDialog onClose={onCardClose}>
        <button onClick={() => setSelected("first")}>Open photo</button>
        <button>Another card action</button>
        {selected && <PhotoViewer photos={photos} selectedId={selected} onSelect={setSelected} onClose={close} />}
    </SpotDialog>;
}

it("closes on the backdrop, keeps the underlying card open and restores focus and its scroll lock", async () => {
    const closeCard = vi.fn();
    const user = userEvent.setup();
    const view = render(<Harness onCardClose={closeCard} />);
    await user.click(screen.getByText("Open photo"));
    const viewer = screen.getByRole("dialog", { name: "Photo viewer" });
    expect(viewer.parentElement).toBe(document.body);
    await user.click(viewer);
    expect(screen.queryByRole("dialog", { name: "Photo viewer" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Spot details" })).toBeTruthy();
    expect(closeCard).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByText("Open photo"));
    expect(document.body.style.overflow).toBe("hidden");
    view.unmount();
    expect(document.body.style.overflow).toBe("");
});

it("does not dismiss when clicking the image or navigating between photos", async () => {
    const user = userEvent.setup();
    const closeCard = vi.fn();
    render(<Harness onCardClose={closeCard} />);
    await user.click(screen.getByText("Open photo"));
    const viewer = screen.getByRole("dialog", { name: "Photo viewer" });
    await user.click(within(viewer).getByAltText("First photo"));
    await user.click(within(viewer).getByLabelText("Next photo"));
    expect(within(viewer).getByAltText("Second photo")).toBeTruthy();
    await user.click(within(viewer).getByLabelText("Previous photo"));
    expect(within(viewer).getByAltText("First photo")).toBeTruthy();
    expect(closeCard).not.toHaveBeenCalled();
    await user.click(within(viewer).getByLabelText("Close photo"));
    expect(screen.queryByRole("dialog", { name: "Photo viewer" })).toBeNull();
});

it("handles Escape even when focus was lost and only closes the top dialog", async () => {
    const user = userEvent.setup();
    const closeCard = vi.fn();
    render(<Harness onCardClose={closeCard} />);
    await user.click(screen.getByText("Open photo"));
    screen.getByText("Another card action").focus();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Photo viewer" })).toBeNull();
    expect(closeCard).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByText("Open photo"));
});

it("keeps Tab and Shift+Tab inside the viewer without activating the outer dialog's focus trap", async () => {
    const user = userEvent.setup();
    render(<Harness onCardClose={vi.fn()} />);
    await user.click(screen.getByText("Open photo"));
    expect(document.activeElement).toBe(screen.getByLabelText("Close photo"));
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByLabelText("Next photo"));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByLabelText("Close photo"));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByLabelText("Previous photo"));
    await user.keyboard("{Escape}");
    expect(document.activeElement).toBe(screen.getByText("Open photo"));
});

it("restores page scrolling when the card and its photo viewer unmount together", async () => {
    const user = userEvent.setup();
    const view = render(<Harness onCardClose={vi.fn()} />);
    await user.click(screen.getByText("Open photo"));
    expect(document.body.style.overflow).toBe("hidden");
    view.unmount();
    expect(document.body.style.overflow).toBe("");
});
