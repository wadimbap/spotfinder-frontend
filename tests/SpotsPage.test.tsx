import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SpotsPage } from "../src/features/spots/SpotsPage";
import { spotsApi } from "../src/features/spots/spotsApi";
import { authApi } from "../src/features/auth/authApi";
import { spot, user } from "./fixtures";

vi.mock("../src/features/spots/spotsApi", () => ({ spotsApi: { getApprovedSpots: vi.fn(), getMetadata: vi.fn() } }));
vi.mock("../src/features/auth/authApi", () => ({ authApi: { getCurrentUser: vi.fn() } }));
vi.mock("../src/features/spots/SpotsMap", () => ({ SpotsMap: ({ spots }: { spots: { name: string }[] }) => <div>{spots.map((item) => item.name).join(", ")}</div> }));

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(user);
    vi.mocked(spotsApi.getApprovedSpots).mockResolvedValue([spot]);
    vi.mocked(spotsApi.getMetadata).mockResolvedValue({ types: ["STREET"], features: ["FLAT"] });
});

it("keeps the map usable when only metadata fails", async () => {
    vi.mocked(spotsApi.getMetadata).mockRejectedValue(new Error("offline"));
    render(<MemoryRouter><SpotsPage /></MemoryRouter>);
    expect(await screen.findByText(spot.name)).toBeTruthy();
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
