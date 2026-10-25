import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CreateSpotPanel } from "../src/features/spots/CreateSpotPanel";
import { spotsApi } from "../src/features/spots/spotsApi";
import { adminSpotsApi } from "../src/features/admin/adminSpotsApi";
import { spot } from "./fixtures";

vi.mock("../src/features/spots/spotsApi", () => ({ spotsApi: { createSpot: vi.fn(), uploadSpotPhoto: vi.fn() } }));
vi.mock("../src/features/admin/adminSpotsApi", () => ({ adminSpotsApi: { createApprovedSpot: vi.fn() } }));
const metadata = { types: ["STREET"] as const, features: ["FLAT"] as const };

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(spotsApi.createSpot).mockResolvedValue({ ...spot, approved: false });
    vi.mocked(adminSpotsApi.createApprovedSpot).mockResolvedValue(spot);
});

function fill() {
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New spot" } });
    fireEvent.click(screen.getByLabelText("FLAT"));
}

it("uses the ordinary creation endpoint by default", async () => {
    const onCreated = vi.fn();
    render(<CreateSpotPanel metadata={{ types: [...metadata.types], features: [...metadata.features] }} location={[1, 2]} onCreated={onCreated} onCancel={vi.fn()} />);
    fill(); fireEvent.click(screen.getByRole("button", { name: "Create spot" }));
    await vi.waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(spotsApi.createSpot).toHaveBeenCalledOnce();
    expect(adminSpotsApi.createApprovedSpot).not.toHaveBeenCalled();
});

it("uses the administrative endpoint only in the explicit approved mode", async () => {
    const onCreated = vi.fn();
    render(<CreateSpotPanel createApproved metadata={{ types: [...metadata.types], features: [...metadata.features] }} location={[1, 2]} onCreated={onCreated} onCancel={vi.fn()} />);
    fill(); fireEvent.click(screen.getByRole("button", { name: "Create approved spot" }));
    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith(spot));
    expect(adminSpotsApi.createApprovedSpot).toHaveBeenCalledOnce();
    expect(spotsApi.createSpot).not.toHaveBeenCalled();
});

it("keeps a partially created spot and retries uploads without creating a duplicate", async () => {
    const onCreated = vi.fn();
    vi.mocked(spotsApi.uploadSpotPhoto).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ id: "photo" } as never);
    render(<CreateSpotPanel metadata={{ types: [...metadata.types], features: [...metadata.features] }} location={[1, 2]} onCreated={onCreated} onCancel={vi.fn()} />);
    fill();
    fireEvent.change(screen.getByLabelText(/Photos \(/), { target: { files: [new File(["png"], "ride.png", { type: "image/png" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Create spot" }));
    expect(await screen.findByText(/Spot created\. 1 photo/)).toBeTruthy();
    expect(onCreated).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Retry failed photos"));
    await vi.waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(spotsApi.createSpot).toHaveBeenCalledOnce();
    expect(spotsApi.uploadSpotPhoto).toHaveBeenCalledTimes(2);
});
