import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SpotCover } from "../src/features/spots/SpotCover";
import { spotsApi } from "../src/features/spots/spotsApi";
import { notifyPhotoUpdate } from "../src/features/spots/photoUpdates";
import { spot, user } from "./fixtures";

vi.mock("../src/features/spots/spotsApi", () => ({ spotsApi: { getSpotPhotos: vi.fn(), getSpotPhotoContent: vi.fn() } }));
const photo = { id: "a", spotId: spot.id, originalFilename: "cover.png", contentType: "image/png", sizeBytes: 10,
    createdByUserId: user.id, createdAt: "2026-10-20T12:00:00Z" };

beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("IntersectionObserver", undefined);
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:cover") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.mocked(spotsApi.getSpotPhotos).mockResolvedValue([photo]);
    vi.mocked(spotsApi.getSpotPhotoContent).mockResolvedValue(new Blob(["photo"]));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("loads only the earliest photo with a deterministic ID tie-break, without reordering the API result", async () => {
    const photos = [{ ...photo, id: "new", createdAt: "2026-10-25T12:00:00Z" }, { ...photo, id: "b" }, photo];
    vi.mocked(spotsApi.getSpotPhotos).mockResolvedValue(photos);
    render(<SpotCover spotId={spot.id} name={spot.name} />);
    await screen.findByAltText(`Cover of ${spot.name}`);
    expect(spotsApi.getSpotPhotoContent).toHaveBeenCalledExactlyOnceWith(spot.id, "a");
    expect(photos.map((item) => item.id)).toEqual(["new", "b", "a"]);
});

it("uses a placeholder without downloading content when the spot has no photos", async () => {
    vi.mocked(spotsApi.getSpotPhotos).mockResolvedValue([]);
    render(<SpotCover spotId={spot.id} name={spot.name} />);
    expect(await screen.findByText("No photo yet")).toBeTruthy();
    expect(spotsApi.getSpotPhotoContent).not.toHaveBeenCalled();
});

it("keeps the card usable when a photo request fails", async () => {
    vi.mocked(spotsApi.getSpotPhotoContent).mockRejectedValue(new Error("offline"));
    render(<article><SpotCover spotId={spot.id} name={spot.name} /><button>View details</button></article>);
    expect(await screen.findByText("Photo unavailable")).toBeTruthy();
    expect(screen.getByRole("button", { name: "View details" }).hasAttribute("disabled")).toBe(false);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
});

it("handles an undecodable image without a broken-image icon", async () => {
    render(<SpotCover spotId={spot.id} name={spot.name} />);
    fireEvent.error(await screen.findByAltText(`Cover of ${spot.name}`));
    expect(screen.getByText("Photo unavailable")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
});

it("waits until the card enters the viewport before making any photo requests", async () => {
    let intersect!: IntersectionObserverCallback;
    const disconnect = vi.fn();
    vi.stubGlobal("IntersectionObserver", class {
        constructor(callback: IntersectionObserverCallback) { intersect = callback; }
        observe = vi.fn(); disconnect = disconnect;
    });
    render(<SpotCover spotId={spot.id} name={spot.name} />);
    expect(spotsApi.getSpotPhotos).not.toHaveBeenCalled();
    act(() => intersect([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    await screen.findByAltText(`Cover of ${spot.name}`);
    expect(disconnect).toHaveBeenCalled();
});

it("refreshes only the affected spot after photo changes and releases replaced URLs", async () => {
    vi.mocked(URL.createObjectURL).mockReturnValueOnce("blob:first").mockReturnValueOnce("blob:next");
    const view = render(<SpotCover spotId={spot.id} name={spot.name} />);
    await screen.findByAltText(`Cover of ${spot.name}`);
    act(() => notifyPhotoUpdate("another-spot"));
    expect(spotsApi.getSpotPhotos).toHaveBeenCalledTimes(1);
    act(() => notifyPhotoUpdate(spot.id));
    await waitFor(() => expect(screen.getByRole("img").getAttribute("src")).toBe("blob:next"));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:first");
    view.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:next");
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
});

it("discards a download that finishes after unmount without allocating a Blob URL", async () => {
    let complete!: (blob: Blob) => void;
    vi.mocked(spotsApi.getSpotPhotoContent).mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    const view = render(<SpotCover spotId={spot.id} name={spot.name} />);
    await waitFor(() => expect(spotsApi.getSpotPhotoContent).toHaveBeenCalled());
    view.unmount();
    await act(async () => complete(new Blob(["late"])));
    expect(URL.createObjectURL).not.toHaveBeenCalled();
});
