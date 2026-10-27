import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminSpotsPage } from "../src/features/admin/AdminSpotsPage";
import { adminSpotsApi } from "../src/features/admin/adminSpotsApi";
import { authApi } from "../src/features/auth/authApi";
import { spot, user } from "./fixtures";

vi.mock("../src/features/admin/adminSpotsApi", () => ({ adminSpotsApi: {
    getPendingSpots: vi.fn(), getApprovedSpots: vi.fn(), approveSpot: vi.fn(), rejectSpot: vi.fn(), updateSpot: vi.fn(),
} }));
vi.mock("../src/features/auth/authApi", () => ({ authApi: { getCurrentUser: vi.fn() } }));
vi.mock("../src/features/spots/SpotDetailsPanel", () => ({ SpotDetailsPanel: ({ source }: { source: string }) => <p>Details source: {source}</p> }));
vi.mock("../src/features/spots/EditSpotPanel", () => ({ EditSpotPanel: ({ spot }: { spot: { name: string } }) => <p>Editing: {spot.name}</p> }));

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({ ...user, role: "MODERATOR" });
    vi.mocked(adminSpotsApi.getPendingSpots).mockResolvedValue([{ ...spot, approved: false }]);
    vi.mocked(adminSpotsApi.getApprovedSpots).mockResolvedValue([spot]);
});

it("blocks direct route access for regular users", async () => {
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(user);
    render(<MemoryRouter><AdminSpotsPage /></MemoryRouter>);
    await screen.findByText(/requires MODERATOR/);
    expect(adminSpotsApi.getPendingSpots).not.toHaveBeenCalled();
    expect(screen.queryByText("Create approved spot")).toBeNull();
});

it("opens a full card through the administrative source", async () => {
    render(<MemoryRouter><AdminSpotsPage /></MemoryRouter>);
    fireEvent.click(await screen.findByText("Review details"));
    expect(screen.getByText("Details source: admin")).toBeTruthy();
});

it("opens the editor directly from a spot card", async () => {
    render(<MemoryRouter><AdminSpotsPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Edit spot" }));
    expect(screen.getByText(`Editing: ${spot.name}`)).toBeTruthy();
});

it("loads approved spots from the administrative endpoint", async () => {
    vi.mocked(adminSpotsApi.getApprovedSpots).mockResolvedValueOnce([
        { ...spot, name: "Approved spot" },
    ]);

    render(<MemoryRouter><AdminSpotsPage /></MemoryRouter>);
    await screen.findByRole("tab", { name: "Pending" });
    fireEvent.click(screen.getByRole("tab", { name: "Approved" }));
    expect(await screen.findByText("Approved spot")).toBeTruthy();
    expect(adminSpotsApi.getApprovedSpots).toHaveBeenCalledOnce();
});

it("confirms rejection and removes the item only after success", async () => {
    vi.mocked(adminSpotsApi.rejectSpot).mockResolvedValue();
    render(<MemoryRouter><AdminSpotsPage /></MemoryRouter>);
    fireEvent.click(await screen.findByText("Reject"));
    expect(adminSpotsApi.rejectSpot).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Confirm rejection"));
    await screen.findByText("No pending spots.");
    expect(adminSpotsApi.rejectSpot).toHaveBeenCalledWith(spot.id);
});

it("retains the item and reports a concurrent approval", async () => {
    vi.mocked(adminSpotsApi.rejectSpot).mockRejectedValue({ isAxiosError: true, response: { status: 409 } });
    render(<MemoryRouter><AdminSpotsPage /></MemoryRouter>);
    fireEvent.click(await screen.findByText("Reject"));
    fireEvent.click(screen.getByText("Confirm rejection"));
    await screen.findByText(/already approved/);
    expect(screen.getByText(spot.name)).toBeTruthy();
    await waitFor(() => expect((screen.getByText("Confirm rejection") as HTMLButtonElement).disabled).toBe(false));
});
