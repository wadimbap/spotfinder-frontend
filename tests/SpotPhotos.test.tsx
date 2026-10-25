import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SpotPhotos } from "../src/features/spots/SpotPhotos";
import { spotsApi } from "../src/features/spots/spotsApi";
import { spot, user } from "./fixtures";

vi.mock("../src/features/spots/spotsApi", () => ({ spotsApi: {
    getSpotPhotos: vi.fn(), getSpotPhotoContent: vi.fn(), uploadSpotPhoto: vi.fn(), deleteSpotPhoto: vi.fn(),
} }));
const photo = { id: "photo-id", spotId: spot.id, originalFilename: "ride.png", contentType: "image/png", sizeBytes: 10,
    createdByUserId: user.id, createdAt: spot.createdAt };

beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:preview") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.mocked(spotsApi.getSpotPhotos).mockResolvedValue([photo]);
    vi.mocked(spotsApi.getSpotPhotoContent).mockResolvedValue(new Blob(["image"]));
});

it("requires confirmation, removes a photo and releases its URL", async () => {
    vi.mocked(spotsApi.deleteSpotPhoto).mockResolvedValue();
    const view = render(<SpotPhotos spot={spot} currentUser={user} />);
    fireEvent.click(await screen.findByText("Delete photo"));
    expect(spotsApi.deleteSpotPhoto).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Confirm delete photo"));
    await screen.findByText("No photos yet.");
    expect(spotsApi.deleteSpotPhoto).toHaveBeenCalledWith(spot.id, photo.id);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
    view.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
});

it("hides upload and deletion for an unrelated regular user", async () => {
    render(<SpotPhotos spot={spot} currentUser={{ ...user, id: "other" }} />);
    await screen.findByAltText("ride.png");
    expect(screen.queryByText("Delete photo")).toBeNull();
    expect(screen.queryByText("Upload photos")).toBeNull();
});

it("allows moderators to delete other authors' photos without granting upload", async () => {
    render(<SpotPhotos spot={spot} currentUser={{ ...user, id: "mod", role: "MODERATOR" }} />);
    expect(await screen.findByText("Delete photo")).toBeTruthy();
    expect(screen.queryByText("Upload photos")).toBeNull();
});

it("retains the photo and shows a denied deletion", async () => {
    vi.mocked(spotsApi.deleteSpotPhoto).mockRejectedValue({ isAxiosError: true, response: { status: 403 } });
    render(<SpotPhotos spot={spot} currentUser={user} />);
    fireEvent.click(await screen.findByText("Delete photo"));
    fireEvent.click(screen.getByText("Confirm delete photo"));
    expect(await screen.findByText(/do not have permission/)).toBeTruthy();
    expect(screen.getByAltText("ride.png")).toBeTruthy();
});

it("retries only failed files after a partial upload", async () => {
    vi.mocked(spotsApi.uploadSpotPhoto).mockResolvedValueOnce(photo).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(photo);
    render(<SpotPhotos spot={spot} currentUser={user} />);
    await screen.findByAltText("ride.png");
    const good = new File(["good"], "good.png", { type: "image/png" });
    const bad = new File(["bad"], "bad.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/Add photos/), { target: { files: [good, bad] } });
    fireEvent.click(screen.getByText("Upload photos"));
    expect(await screen.findByText(/1 uploaded, 1 failed/)).toBeTruthy();
    await waitFor(() => expect((screen.getByText("Upload photos") as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByText("Upload photos"));
    await screen.findByText("1 photo uploaded.");
    expect(vi.mocked(spotsApi.uploadSpotPhoto).mock.calls.map((call) => call[1].name)).toEqual(["good.png", "bad.png", "bad.png"]);
});

it("does not create a Blob URL when a download finishes after unmount", async () => {
    let resolve!: (value: Blob) => void;
    vi.mocked(spotsApi.getSpotPhotoContent).mockReturnValue(new Promise((done) => { resolve = done; }));
    const view = render(<SpotPhotos spot={spot} currentUser={user} />);
    await waitFor(() => expect(spotsApi.getSpotPhotoContent).toHaveBeenCalled());
    view.unmount(); resolve(new Blob(["late"]));
    await Promise.resolve();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
});
