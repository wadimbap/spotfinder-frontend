import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProfilePage } from "../src/features/profile/ProfilePage";
import { authApi } from "../src/features/auth/authApi";
import { user } from "./fixtures";

vi.mock("../src/features/auth/authApi", () => ({ authApi: { getCurrentUser: vi.fn(), updateCurrentUser: vi.fn() } }));
beforeEach(() => { vi.resetAllMocks(); vi.mocked(authApi.getCurrentUser).mockResolvedValue(user); });

it("saves a trimmed name and explicitly clears activity", async () => {
    vi.mocked(authApi.updateCurrentUser).mockResolvedValue({ ...user, displayName: "New name", primaryActivity: null });
    render(<ProfilePage />);
    await screen.findByLabelText("Name");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: " New name " } });
    fireEvent.change(screen.getByLabelText("Primary activity"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Save profile"));
    expect(await screen.findByText("Profile saved.")).toBeTruthy();
    expect(authApi.updateCurrentUser).toHaveBeenCalledWith({ displayName: "New name", primaryActivity: null });
});

it("keeps unsaved values after failure and allows retry", async () => {
    vi.mocked(authApi.updateCurrentUser).mockRejectedValue(new Error("offline"));
    render(<ProfilePage />);
    await screen.findByLabelText("Name");
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Keep me" } });
    fireEvent.click(screen.getByText("Save profile"));
    await screen.findByRole("alert");
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Keep me");
    await waitFor(() => expect((screen.getByText("Save profile") as HTMLButtonElement).disabled).toBe(false));
});
