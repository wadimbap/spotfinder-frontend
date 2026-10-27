import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SpotsPage } from "../src/features/spots/SpotsPage";
import { spotsApi } from "../src/features/spots/spotsApi";
import { authApi } from "../src/features/auth/authApi";
import { spot, user } from "./fixtures";

vi.mock("../src/features/spots/spotsApi", () => ({ spotsApi: { getApprovedSpots: vi.fn(), getMetadata: vi.fn(), updateSpot: vi.fn() } }));
vi.mock("../src/features/auth/authApi", () => ({ authApi: { getCurrentUser: vi.fn() } }));
vi.mock("../src/features/admin/adminSpotsApi", () => ({ adminSpotsApi: { updateSpot: vi.fn() } }));
vi.mock("../src/features/spots/SpotsMap", () => ({ SpotsMap: ({ spots, onSpotClick }: { spots: typeof spot[]; onSpotClick: (spot: typeof spot) => void }) => <div>{spots.map((item) => <button key={item.id} onClick={() => onSpotClick(item)}>Open {item.name}</button>)}</div> }));
vi.mock("../src/features/spots/SpotDetailsPanel", () => ({ SpotDetailsPanel: ({ spot, onEdit, onSpotUpdated }: {
    spot: typeof spot; onEdit: (spot: typeof spot, user: typeof user) => void; onSpotUpdated: (spot: typeof spot) => void;
}) => <><button onClick={() => void authApi.getCurrentUser().then((user) => onEdit(spot, user))}>Edit spot</button>
    <button onClick={() => onSpotUpdated({ ...spot, approved: false })}>Upload a photo</button></> }));
vi.mock("../src/features/spots/EditSpotPanel", () => ({ EditSpotPanel: ({ spot, saveSpot, onSaved }: {
    spot: typeof spot; saveSpot: (spotId: string, request: object) => Promise<typeof spot>; onSaved: (spot: typeof spot) => void;
}) => <button onClick={() => void saveSpot(spot.id, {}).then(onSaved)}>Save map edit</button> }));

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(user);
    vi.mocked(spotsApi.getApprovedSpots).mockResolvedValue([spot]);
    vi.mocked(spotsApi.getMetadata).mockResolvedValue({
        types: ["STREET", "SKATEPARK"], features: ["FLAT", "RAIL", "LIGHTING", "COVERED"],
    });
});

it("keeps the map usable when only metadata fails", async () => {
    vi.mocked(spotsApi.getMetadata).mockRejectedValue(new Error("offline"));
    render(<MemoryRouter><SpotsPage /></MemoryRouter>);
    expect(await screen.findByRole("button", { name: `Open ${spot.name}` })).toBeTruthy();
    expect(screen.getByText(/Failed to load spot types/)).toBeTruthy();
});

it("does not fall back to ordinary creation for an unauthorized approved-create URL", async () => {
    render(<MemoryRouter initialEntries={["/spots?create=approved"]}><SpotsPage /></MemoryRouter>);
    await screen.findByText(/requires MODERATOR/);
    expect(screen.queryByRole("button", { name: "Create spot" })).toBeNull();
});

it("opens ordinary creation directly from the my-spots link", async () => {
    render(<MemoryRouter initialEntries={["/spots?create=pending"]}><SpotsPage /></MemoryRouter>);
    expect(await screen.findByRole("button", { name: "Create spot" })).toBeTruthy();
});

it("sends selected map filters to the spots API", async () => {
    render(<MemoryRouter><SpotsPage /></MemoryRouter>);
    await screen.findByRole("button", { name: `Open ${spot.name}` });
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Street" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Rail" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Lighting" }));

    await waitFor(() => expect(spotsApi.getApprovedSpots).toHaveBeenLastCalledWith({
        query: "", types: ["STREET"], features: ["RAIL", "LIGHTING"],
    }));
});

it("searches spots by name after typing stops", async () => {
    render(<MemoryRouter><SpotsPage /></MemoryRouter>);
    await screen.findByRole("button", { name: `Open ${spot.name}` });
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "central" } });

    await waitFor(() => expect(spotsApi.getApprovedSpots).toHaveBeenLastCalledWith({
        query: "central", types: [], features: [],
    }), { timeout: 1000 });
});

it("uses the moderator endpoint when editing a map marker", async () => {
    const { adminSpotsApi } = await import("../src/features/admin/adminSpotsApi");
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({ ...user, role: "MODERATOR" });
    vi.mocked(adminSpotsApi.updateSpot).mockResolvedValue(spot);
    render(<MemoryRouter><SpotsPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: `Open ${spot.name}` }));
    fireEvent.click(screen.getByRole("button", { name: "Edit spot" }));
    fireEvent.click(await screen.findByRole("button", { name: "Save map edit" }));
    await waitFor(() => expect(adminSpotsApi.updateSpot).toHaveBeenCalledWith(spot.id, {}));
});

it("removes a marker and explains pending moderation after an owner edit", async () => {
    vi.mocked(spotsApi.getApprovedSpots).mockResolvedValueOnce([spot]).mockResolvedValue([]);
    vi.mocked(spotsApi.updateSpot).mockResolvedValue({ ...spot, approved: false });
    render(<MemoryRouter><SpotsPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: `Open ${spot.name}` }));
    fireEvent.click(screen.getByRole("button", { name: "Edit spot" }));
    fireEvent.click(await screen.findByRole("button", { name: "Save map edit" }));
    await screen.findByText(/Spot sent for moderation/);
    expect(screen.queryByRole("button", { name: `Open ${spot.name}` })).toBeNull();
});

it("removes a marker after a photo sends its spot back for moderation", async () => {
    vi.mocked(spotsApi.getApprovedSpots).mockResolvedValueOnce([spot]).mockResolvedValue([]);
    render(<MemoryRouter><SpotsPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: `Open ${spot.name}` }));
    fireEvent.click(screen.getByRole("button", { name: "Upload a photo" }));
    expect(screen.queryByRole("button", { name: `Open ${spot.name}` })).toBeNull();
    expect(screen.getByText(/Spot sent for moderation/)).toBeTruthy();
});
