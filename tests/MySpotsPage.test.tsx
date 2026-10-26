import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MySpotsPage } from "../src/features/spots/MySpotsPage";
import { spotsApi } from "../src/features/spots/spotsApi";
import { spot } from "./fixtures";

vi.mock("../src/features/spots/spotsApi", () => ({ spotsApi: { getMySpots: vi.fn(), getSpotPhotos: vi.fn() } }));
vi.mock("../src/features/spots/SpotDetailsPanel", () => ({ SpotDetailsPanel: () => <p>Opened details</p> }));

beforeEach(() => { vi.resetAllMocks(); vi.mocked(spotsApi.getSpotPhotos).mockResolvedValue([]); });

it("shows both statuses and opens a pending card", async () => {
    vi.mocked(spotsApi.getMySpots).mockResolvedValue([spot, { ...spot, id: "pending", name: "My draft", approved: false }]);
    render(<MemoryRouter><MySpotsPage /></MemoryRouter>);
    expect(await screen.findByText("My draft")).toBeTruthy();
    expect(screen.getByText("Approved")).toBeTruthy();
    expect(screen.getByText("Pending")).toBeTruthy();
    fireEvent.click(screen.getAllByText("View details")[1]);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Opened details")).toBeTruthy();
});

it("shows a recoverable error rather than a false empty state", async () => {
    vi.mocked(spotsApi.getMySpots).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([]);
    render(<MemoryRouter><MySpotsPage /></MemoryRouter>);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText(/not added any/)).toBeNull();
    fireEvent.click(screen.getByText("Retry"));
    expect(await screen.findByText(/not added any/)).toBeTruthy();
});
