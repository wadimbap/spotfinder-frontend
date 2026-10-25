import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SpotDetailsPanel } from "../src/features/spots/SpotDetailsPanel";
import { spotsApi } from "../src/features/spots/spotsApi";
import { authApi } from "../src/features/auth/authApi";
import { spot, user } from "./fixtures";
import { adminSpotsApi } from "../src/features/admin/adminSpotsApi";
import { commentsApi } from "../src/features/comments/commentsApi";

vi.mock("../src/features/spots/spotsApi", () => ({ spotsApi: {
    getApprovedSpot: vi.fn(), getSpotPhotos: vi.fn(), getSpotPhotoContent: vi.fn(),
} }));
vi.mock("../src/features/auth/authApi", () => ({ authApi: { getCurrentUser: vi.fn() } }));
vi.mock("../src/features/admin/adminSpotsApi", () => ({ adminSpotsApi: { getSpot: vi.fn() } }));
vi.mock("../src/features/comments/commentsApi", () => ({ commentsApi: { getComments: vi.fn() } }));

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(commentsApi.getComments).mockResolvedValue([]);
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(user);
    vi.mocked(spotsApi.getSpotPhotos).mockResolvedValue([]);
    vi.mocked(spotsApi.getApprovedSpot).mockResolvedValue({ ...spot, name: "Fresh spot" });
});

describe("spot details", () => {
    it("refreshes pending moderation details via the admin endpoint", async () => {
        vi.mocked(adminSpotsApi.getSpot).mockResolvedValue({ ...spot, approved: false, name: "Pending review" });
        render(<SpotDetailsPanel source="admin" spot={{ ...spot, approved: false }} onClose={vi.fn()} />);
        expect(await screen.findByRole("heading", { name: "Pending review" })).toBeTruthy();
        expect(adminSpotsApi.getSpot).toHaveBeenCalledWith(spot.id);
        expect(spotsApi.getApprovedSpot).not.toHaveBeenCalled();
    });
    it("refreshes approved details before requesting photos", async () => {
        render(<SpotDetailsPanel spot={spot} onClose={vi.fn()} />);
        expect(await screen.findByRole("heading", { name: "Fresh spot" })).toBeTruthy();
        await waitFor(() => expect(spotsApi.getSpotPhotos).toHaveBeenCalledWith(spot.id));
    });

    it("opens an own pending spot without using the approved-only endpoint", async () => {
        render(<SpotDetailsPanel spot={{ ...spot, approved: false }} onClose={vi.fn()} />);
        expect(screen.getByText("Pending moderation")).toBeTruthy();
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
