import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SpotDetailsPanel } from "../src/features/spots/SpotDetailsPanel";
import { spotsApi } from "../src/features/spots/spotsApi";
import { authApi } from "../src/features/auth/authApi";
import { spot, user } from "./fixtures";
import { adminSpotsApi } from "../src/features/admin/adminSpotsApi";
import { commentsApi } from "../src/features/comments/commentsApi";

vi.mock("../src/features/spots/spotsApi", () => ({ spotsApi: {
    getApprovedSpot: vi.fn(), getMySpots: vi.fn(), getSpotPhotos: vi.fn(), getSpotPhotoContent: vi.fn(), uploadSpotPhoto: vi.fn(),
} }));
vi.mock("../src/features/auth/authApi", () => ({ authApi: { getCurrentUser: vi.fn() } }));
vi.mock("../src/features/admin/adminSpotsApi", () => ({ adminSpotsApi: { getSpot: vi.fn() } }));
vi.mock("../src/features/comments/commentsApi", () => ({ commentsApi: { getComments: vi.fn() } }));
vi.mock("../src/features/spots/SpotLocationMap", () => ({
    SpotLocationMap: ({ latitude, longitude, spotName }: { latitude: number; longitude: number; spotName: string }) => (
        <div data-testid="spot-location-map">{spotName}: {latitude}, {longitude}</div>
    ),
}));

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(commentsApi.getComments).mockResolvedValue([]);
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(user);
    vi.mocked(spotsApi.getSpotPhotos).mockResolvedValue([]);
    vi.mocked(spotsApi.getApprovedSpot).mockResolvedValue({ ...spot, name: "Fresh spot" });
});

describe("spot details", () => {
    it("updates the card and its parent after uploading without losing failed files", async () => {
        const onSpotUpdated = vi.fn();
        const photo = { id: "photo", spotId: spot.id, originalFilename: "good.png", contentType: "image/png",
            sizeBytes: 4, createdByUserId: user.id, createdAt: spot.createdAt };
        vi.mocked(spotsApi.getApprovedSpot).mockResolvedValue(spot);
        vi.mocked(spotsApi.uploadSpotPhoto).mockResolvedValueOnce(photo).mockRejectedValueOnce(new Error("offline"));
        render(<SpotDetailsPanel spot={spot} onClose={vi.fn()} onSpotUpdated={onSpotUpdated} />);
        await screen.findByText("No photos yet.");
        await screen.findByRole("button", { name: "Add photos", exact: true });
        fireEvent.change(screen.getByLabelText(/Add photos/), { target: { files: [
            new File(["good"], "good.png", { type: "image/png" }), new File(["bad"], "bad.png", { type: "image/png" }),
        ] } });
        fireEvent.click(screen.getByText("Upload photos"));
        expect(await screen.findByText("Pending")).toBeTruthy();
        expect(screen.getByText(/1 uploaded, 1 failed/)).toBeTruthy();
        expect(screen.getByText("bad.png")).toBeTruthy();
        expect(onSpotUpdated).toHaveBeenCalledWith({ ...spot, approved: false });
    });

    it("refreshes pending moderation details via the admin endpoint", async () => {
        vi.mocked(adminSpotsApi.getSpot).mockResolvedValue({ ...spot, approved: false, name: "Pending review" });
        render(<SpotDetailsPanel source="admin" spot={{ ...spot, approved: false }} onClose={vi.fn()} />);
        expect(await screen.findByRole("heading", { name: "Pending review" })).toBeTruthy();
        expect(adminSpotsApi.getSpot).toHaveBeenCalledWith(spot.id);
        expect(spotsApi.getApprovedSpot).not.toHaveBeenCalled();
    });
    it("shows the reviewed spot location on a map for moderators", async () => {
        vi.mocked(adminSpotsApi.getSpot).mockResolvedValue({ ...spot, approved: false, name: "Pending review" });
        render(<SpotDetailsPanel source="admin" spot={{ ...spot, approved: false }} onClose={vi.fn()} />);
        expect((await screen.findByTestId("spot-location-map")).textContent).toBe(`Pending review: ${spot.latitude}, ${spot.longitude}`);
    });
    it("lets a moderator open the existing editor for an approved spot", async () => {
        const onEdit = vi.fn();
        vi.mocked(authApi.getCurrentUser).mockResolvedValue({ ...user, role: "MODERATOR" });
        vi.mocked(adminSpotsApi.getSpot).mockResolvedValue(spot);

        render(<SpotDetailsPanel source="admin" spot={spot} onClose={vi.fn()} onEdit={onEdit} />);

        fireEvent.click(await screen.findByRole("button", { name: "Edit spot" }));
        expect(onEdit).toHaveBeenCalledWith(spot, expect.objectContaining({ role: "MODERATOR" }));
    });
    it("shows the same card and editor action for an owner's approved spot", async () => {
        const onEdit = vi.fn();
        vi.mocked(spotsApi.getMySpots).mockResolvedValue([spot]);

        render(<SpotDetailsPanel source="own" spot={spot} onClose={vi.fn()} onEdit={onEdit} />);

        expect((await screen.findByTestId("spot-location-map")).textContent).toBe(`Original spot: ${spot.latitude}, ${spot.longitude}`);
        fireEvent.click(screen.getByRole("button", { name: "Edit spot" }));
        expect(onEdit).toHaveBeenCalledWith(spot, user);
    });
    it("does not offer editing to a regular user for somebody else's spot", async () => {
        vi.mocked(spotsApi.getApprovedSpot).mockResolvedValue({ ...spot, name: "Fresh spot", createdByUserId: "other-user" });
        render(<SpotDetailsPanel spot={spot} onClose={vi.fn()} onEdit={vi.fn()} />);
        await screen.findByRole("heading", { name: "Fresh spot" });
        expect(screen.queryByRole("button", { name: "Edit spot" })).toBeNull();
    });
    it("refreshes approved details before requesting photos", async () => {
        render(<SpotDetailsPanel spot={spot} onClose={vi.fn()} />);
        expect(await screen.findByRole("heading", { name: "Fresh spot" })).toBeTruthy();
        await waitFor(() => expect(spotsApi.getSpotPhotos).toHaveBeenCalledWith(spot.id));
    });

    it("opens an own pending spot without using the approved-only endpoint", async () => {
        render(<SpotDetailsPanel spot={{ ...spot, approved: false }} onClose={vi.fn()} />);
        expect(screen.getByText("Pending")).toBeTruthy();
        await waitFor(() => expect(spotsApi.getSpotPhotos).toHaveBeenCalledWith(spot.id));
        expect(spotsApi.getApprovedSpot).not.toHaveBeenCalled();
    });

    it("does not request photos after the spot is unavailable", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        vi.mocked(spotsApi.getApprovedSpot).mockRejectedValue(new Error("Not found"));
        render(<SpotDetailsPanel spot={spot} onClose={vi.fn()} />);
        expect(await screen.findByText(/may no longer be available/)).toBeTruthy();
        expect(spotsApi.getSpotPhotos).not.toHaveBeenCalled();
        vi.restoreAllMocks();
    });
});
