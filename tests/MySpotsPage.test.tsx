import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MySpotsPage } from "../src/features/spots/MySpotsPage";
import { spotsApi } from "../src/features/spots/spotsApi";
import { spot } from "./fixtures";
import type { SpotResponse } from "../src/features/spots/spotsTypes";
import type { CurrentUserResponse } from "../src/features/auth/authTypes";

vi.mock("../src/features/spots/spotsApi", () => ({ spotsApi: { getMySpots: vi.fn(), getSpotPhotos: vi.fn() } }));
vi.mock("../src/features/spots/SpotDetailsPanel", () => ({ SpotDetailsPanel: ({ spot, onEdit, onSpotUpdated }: {
    spot: SpotResponse; onEdit: (spot: SpotResponse, user: CurrentUserResponse) => void; onSpotUpdated: (spot: SpotResponse) => void;
}) => <><p>Opened details</p><button onClick={() => onEdit(spot, { id: "owner-id", email: "owner@example.com", displayName: "Alex", role: "USER", primaryActivity: "BMX" })}>Edit spot</button>
    <button onClick={() => onSpotUpdated({ ...spot, approved: false })}>Upload a photo</button></> }));
vi.mock("../src/features/spots/EditSpotPanel", () => ({ EditSpotPanel: ({ spot }: { spot: SpotResponse }) => <p>Editing: {spot.name}</p> }));

beforeEach(() => { vi.resetAllMocks(); vi.mocked(spotsApi.getSpotPhotos).mockResolvedValue([]); });

it("shows both statuses and opens a pending card", async () => {
    vi.mocked(spotsApi.getMySpots).mockResolvedValue([spot, { ...spot, id: "pending", name: "My draft", approved: false }]);
    render(<MemoryRouter><MySpotsPage /></MemoryRouter>);
    expect(await screen.findByText("My draft")).toBeTruthy();
    expect(screen.getByText("Approved")).toBeTruthy();
    expect(screen.getByText("Pending")).toBeTruthy();
    fireEvent.click(screen.getAllByText("View details")[1]);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Opened details")).toBeTruthy();
});

it("opens the approved spot editor from its details card", async () => {
    vi.mocked(spotsApi.getMySpots).mockResolvedValue([spot]);
    render(<MemoryRouter><MySpotsPage /></MemoryRouter>);
    fireEvent.click(await screen.findByText("View details"));
    fireEvent.click(screen.getByRole("button", { name: "Edit spot" }));
    expect(screen.getByText(`Editing: ${spot.name}`)).toBeTruthy();
});

it("shows a recoverable error rather than a false empty state", async () => {
    vi.mocked(spotsApi.getMySpots).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([]);
    render(<MemoryRouter><MySpotsPage /></MemoryRouter>);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText(/not added any/)).toBeNull();
    fireEvent.click(screen.getByText("Retry"));
    expect(await screen.findByText(/not added any/)).toBeTruthy();
});

it("updates the list status after an upload while keeping the details mounted", async () => {
    vi.mocked(spotsApi.getMySpots).mockResolvedValue([spot]);
    render(<MemoryRouter><MySpotsPage /></MemoryRouter>);
    fireEvent.click(await screen.findByText("View details"));
    fireEvent.click(screen.getByRole("button", { name: "Upload a photo" }));
    expect(screen.getByText("Pending")).toBeTruthy();
    expect(screen.queryByText("Approved")).toBeNull();
    expect(screen.getByText("Opened details")).toBeTruthy();
});
