import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DeleteSpotAction } from "../src/features/admin/DeleteSpotAction";
import { adminSpotsApi } from "../src/features/admin/adminSpotsApi";
import { spot, user } from "./fixtures";

vi.mock("../src/features/admin/adminSpotsApi", () => ({ adminSpotsApi: { deleteSpot: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());

it.each(["USER", "MODERATOR"] as const)("does not expose deletion to %s", (role) => {
    render(<DeleteSpotAction spotId={spot.id} currentUser={{ ...user, role }} onDeleted={vi.fn()} />);
    expect(screen.queryByText("Delete spot")).toBeNull();
});

it("asks for confirmation and updates the page after deletion", async () => {
    vi.mocked(adminSpotsApi.deleteSpot).mockResolvedValue();
    const onDeleted = vi.fn();
    render(<DeleteSpotAction spotId={spot.id} currentUser={{ ...user, role: "ADMIN" }} onDeleted={onDeleted} />);
    fireEvent.click(screen.getByText("Delete spot"));
    expect(adminSpotsApi.deleteSpot).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Confirm delete spot"));
    await vi.waitFor(() => expect(onDeleted).toHaveBeenCalledWith(spot.id));
    expect(adminSpotsApi.deleteSpot).toHaveBeenCalledOnce();
});

it("does not remove the card when the server denies deletion", async () => {
    vi.mocked(adminSpotsApi.deleteSpot).mockRejectedValue({ isAxiosError: true, response: { status: 403 } });
    const onDeleted = vi.fn();
    render(<DeleteSpotAction spotId={spot.id} currentUser={{ ...user, role: "ADMIN" }} onDeleted={onDeleted} />);
    fireEvent.click(screen.getByText("Delete spot")); fireEvent.click(screen.getByText("Confirm delete spot"));
    expect(await screen.findByText(/do not have permission/)).toBeTruthy();
    expect(onDeleted).not.toHaveBeenCalled();
});
