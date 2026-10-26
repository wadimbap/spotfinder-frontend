import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SpotPhotos } from "../src/features/spots/SpotPhotos";
import { SpotCover } from "../src/features/spots/SpotCover";
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

it("uses the earliest photo as the large cover, opens it, and replaces it after deletion", async () => {
    const second = { ...photo, id: "second", originalFilename: "second.png", createdAt: "2026-10-26T10:00:00Z" };
    vi.mocked(spotsApi.getSpotPhotos).mockResolvedValue([second, photo]);
    vi.mocked(URL.createObjectURL).mockReturnValueOnce("blob:first").mockReturnValueOnce("blob:second");
    vi.mocked(spotsApi.deleteSpotPhoto).mockResolvedValue();
    render(<SpotPhotos spot={spot} currentUser={user} showCover><h1>{spot.name}</h1></SpotPhotos>);
    const cover = await screen.findByRole("button", { name: `View cover photo of ${spot.name}` });
    expect(cover.querySelector("img")?.src).toBe("blob:first");
    expect(spotsApi.getSpotPhotoContent).toHaveBeenCalledTimes(2);
    fireEvent.click(cover);
    expect(screen.getByRole("dialog", { name: "Photo viewer" })).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Close photo"));
    fireEvent.click(screen.getAllByText("Delete photo")[0]);
    fireEvent.click(screen.getByText("Confirm delete photo"));
    await waitFor(() => expect(cover.querySelector("img")?.src).toBe("blob:second"));
    expect(spotsApi.getSpotPhotos).toHaveBeenCalledTimes(1);
});

it("shows an unavailable cover when the earliest photo fails, while retaining other gallery photos", async () => {
    vi.mocked(spotsApi.getSpotPhotos).mockResolvedValue([photo, { ...photo, id: "second", originalFilename: "second.png", createdAt: "2026-10-26T10:00:00Z" }]);
    vi.mocked(spotsApi.getSpotPhotoContent).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(new Blob(["second"]));
    render(<SpotPhotos spot={spot} currentUser={user} showCover />);
    expect(await screen.findByText("Photo unavailable")).toBeTruthy();
    expect(screen.getByAltText("second.png")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /View cover photo/ })).toBeNull();
});

it("refreshes a mounted list cover when the gallery deletes its first photo", async () => {
    let photos = [photo, { ...photo, id: "second", originalFilename: "second.png", createdAt: "2026-10-26T10:00:00Z" }];
    vi.mocked(spotsApi.getSpotPhotos).mockImplementation(async () => [...photos]);
    vi.mocked(spotsApi.deleteSpotPhoto).mockImplementation(async (_spotId, id) => { photos = photos.filter((item) => item.id !== id); });
    let sequence = 0;
    vi.mocked(URL.createObjectURL).mockImplementation(() => `blob:photo-${++sequence}`);
    render(<><SpotCover spotId={spot.id} name={spot.name} /><SpotPhotos spot={spot} currentUser={user} /></>);
    const cover = await screen.findByAltText(`Cover of ${spot.name}`);
    const oldSource = cover.getAttribute("src");
    await screen.findByAltText("second.png");
    fireEvent.click(screen.getAllByText("Delete photo")[0]);
    fireEvent.click(screen.getByText("Confirm delete photo"));
    await waitFor(() => {
        expect(screen.getByAltText(`Cover of ${spot.name}`).getAttribute("src")).not.toBe(oldSource);
    });
    expect(spotsApi.getSpotPhotoContent).toHaveBeenLastCalledWith(spot.id, "second");
});

it("replaces a mounted empty cover after a successful photo upload", async () => {
    let photos: typeof photo[] = [];
    vi.mocked(spotsApi.getSpotPhotos).mockImplementation(async () => [...photos]);
    vi.mocked(spotsApi.uploadSpotPhoto).mockImplementation(async () => { photos = [photo]; return photo; });
    render(<><SpotCover spotId={spot.id} name={spot.name} /><SpotPhotos spot={spot} currentUser={user} /></>);
    await screen.findByText("No photo yet");
    await screen.findByText("No photos yet.");
    fireEvent.change(screen.getByLabelText(/Add photos/), { target: { files: [new File(["photo"], "ride.png", { type: "image/png" })] } });
    fireEvent.click(screen.getByText("Upload photos"));
    expect(await screen.findByAltText(`Cover of ${spot.name}`)).toBeTruthy();
    expect(await screen.findByAltText("ride.png")).toBeTruthy();
});
