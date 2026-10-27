import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EditSpotPanel } from "../src/features/spots/EditSpotPanel";
import { spotsApi } from "../src/features/spots/spotsApi";
import { spot } from "./fixtures";

vi.mock("../src/features/spots/spotsApi", () => ({ spotsApi: { getMetadata: vi.fn(), updateSpot: vi.fn() } }));
vi.mock("../src/features/spots/LocationPicker", () => ({ LocationPicker: ({ onChange }: { onChange: (v: [number, number]) => void }) =>
    <button type="button" onClick={() => onChange([55.75, 37.62])}>Pick new location</button> }));

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(spotsApi.getMetadata).mockResolvedValue({ types: ["STREET", "SKATEPARK"], features: ["FLAT", "RAIL"] });
});

it("saves changed coordinates and fields without sending ownership or approval", async () => {
    const onSaved = vi.fn();
    vi.mocked(spotsApi.updateSpot).mockResolvedValue({ ...spot, approved: false });
    render(<EditSpotPanel spot={{ ...spot, approved: false }} onSaved={onSaved} onClose={vi.fn()} onConflict={vi.fn()} />);
    await screen.findByText("RAIL");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: " Updated name " } });
    fireEvent.click(screen.getByText("Pick new location"));
    fireEvent.click(screen.getByText("Save changes"));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(spotsApi.updateSpot).toHaveBeenCalledWith(spot.id, {
        name: "Updated name", description: spot.description, latitude: 55.75, longitude: 37.62, type: "STREET", features: ["FLAT"],
    });
});

it("retains the draft and blocks resubmission after a save conflict", async () => {
    const onConflict = vi.fn();
    vi.mocked(spotsApi.updateSpot).mockRejectedValue({ isAxiosError: true, response: { status: 409 } });
    render(<EditSpotPanel spot={{ ...spot, approved: false }} onSaved={vi.fn()} onClose={vi.fn()} onConflict={onConflict} />);
    await screen.findByText("RAIL");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Unsaved draft" } });
    fireEvent.click(screen.getByText("Save changes"));
    expect(await screen.findByText("Failed to save spot.")).toBeTruthy();
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Unsaved draft");
    expect((screen.getByText("Save changes") as HTMLButtonElement).disabled).toBe(true);
    expect(onConflict).toHaveBeenCalledOnce();
});

it("keeps the server response when an approved spot is saved unchanged", async () => {
    const onSaved = vi.fn();
    vi.mocked(spotsApi.updateSpot).mockResolvedValue(spot);
    render(<EditSpotPanel spot={spot} onSaved={onSaved} onClose={vi.fn()} onConflict={vi.fn()} />);
    await screen.findByText("RAIL");
    fireEvent.click(screen.getByText("Save changes"));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(spot));
    expect(spotsApi.updateSpot).toHaveBeenCalledWith(spot.id, expect.objectContaining({ features: ["FLAT"] }));
});

it("warns an owner before changing a published spot and propagates pending status", async () => {
    const onSaved = vi.fn();
    const pending = { ...spot, name: "Changed spot", approved: false };
    vi.mocked(spotsApi.updateSpot).mockResolvedValue(pending);
    render(<EditSpotPanel spot={spot} onSaved={onSaved} onClose={vi.fn()} onConflict={vi.fn()} />);
    expect(screen.getByRole("note").textContent).toContain("hide it from the shared map");
    await screen.findByText("RAIL");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: pending.name } });
    fireEvent.click(screen.getByText("Save changes"));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(pending));
});

it("does not warn of losing approval for an administrative edit", async () => {
    render(<EditSpotPanel spot={spot} requiresModeration={false} onSaved={vi.fn()} onClose={vi.fn()} onConflict={vi.fn()} />);
    await screen.findByText("RAIL");
    expect(screen.queryByRole("note")).toBeNull();
});
