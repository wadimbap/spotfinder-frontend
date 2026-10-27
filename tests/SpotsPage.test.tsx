import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    vi.mocked(spotsApi.getMetadata).mockResolvedValue({
        types: ["STREET", "SKATEPARK"], features: ["FLAT", "RAIL", "LIGHTING", "COVERED"],
    });
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

it("sends selected map filters to the spots API", async () => {
    render(<MemoryRouter><SpotsPage /></MemoryRouter>);
    await screen.findByText(spot.name);
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Street" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Rail" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Lighting" }));

    await waitFor(() => expect(spotsApi.getApprovedSpots).toHaveBeenLastCalledWith({
        query: "", types: ["STREET"], features: ["RAIL", "LIGHTING"],
    }));
});

it("searches spots by name after typing stops", async () => {
    render(<MemoryRouter><SpotsPage /></MemoryRouter>);
    await screen.findByText(spot.name);
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "central" } });

    await waitFor(() => expect(spotsApi.getApprovedSpots).toHaveBeenLastCalledWith({
        query: "central", types: [], features: [],
    }), { timeout: 1000 });
});
