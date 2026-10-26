import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";

import { RequireAuth } from "../src/shared/auth/RequireAuth";
import { ensureSession } from "../src/shared/auth/sessionManager";
import { tokenStorage } from "../src/shared/auth/tokenStorage";

vi.mock("../src/shared/auth/sessionManager", () => ({
    ensureSession: vi.fn(),
    SessionChangedError: class extends Error {},
}));

beforeEach(() => {
    localStorage.clear();
    vi.mocked(ensureSession).mockReset();
});

function renderGate(children = <div>Private page</div>) {
    return render(<MemoryRouter initialEntries={["/private"]}><Routes>
        <Route path="/private" element={<RequireAuth>{children}</RequireAuth>} />
        <Route path="/login" element={<div>Sign in page</div>} />
    </Routes></MemoryRouter>);
}

it("waits for restoration instead of redirecting when the access token is absent", async () => {
    let finish!: (token: string) => void;
    vi.mocked(ensureSession).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    renderGate();
    expect(screen.getByText("Restoring your session...")).toBeTruthy();

    await act(async () => {
        tokenStorage.setAccessToken("restored");
        finish("restored");
    });

    expect(await screen.findByText("Private page")).toBeTruthy();
});

it("keeps a failed restoration retryable without redirecting to login", async () => {
    tokenStorage.startSession("existing");
    vi.mocked(ensureSession).mockRejectedValueOnce(new Error("offline"));
    renderGate();

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText("Sign in page")).toBeNull();
    expect(tokenStorage.getAccessToken()).toBe("existing");

    vi.mocked(ensureSession).mockResolvedValueOnce("existing");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Private page")).toBeTruthy();
});

it("redirects after a definitive rejection without getting stuck on loading", async () => {
    vi.mocked(ensureSession).mockRejectedValueOnce({
        isAxiosError: true, response: { status: 401 },
    });
    renderGate();
    expect(await screen.findByText("Sign in page")).toBeTruthy();
});

it("responds to logout in another tab", async () => {
    tokenStorage.startSession("existing");
    vi.mocked(ensureSession).mockResolvedValueOnce("existing");
    renderGate();
    await screen.findByText("Private page");

    act(() => {
        localStorage.setItem("spotfinder.auth.state", JSON.stringify({ token: null, epoch: "other-tab" }));
        window.dispatchEvent(new StorageEvent("storage", { key: "spotfinder.auth.state" }));
    });

    expect(await screen.findByText("Sign in page")).toBeTruthy();
});

it("resets private component state when another tab changes account", async () => {
    function PrivateState() {
        const [value, setValue] = useState("initial");
        return <button onClick={() => setValue("old-account-draft")}>{value}</button>;
    }
    tokenStorage.startSession("first-account");
    vi.mocked(ensureSession).mockResolvedValueOnce("first-account");
    renderGate(<PrivateState />);
    fireEvent.click(await screen.findByText("initial"));
    expect(screen.getByText("old-account-draft")).toBeTruthy();

    act(() => {
        localStorage.setItem("spotfinder.auth.state", JSON.stringify({ token: "second-account", epoch: "new-account" }));
        window.dispatchEvent(new StorageEvent("storage", { key: "spotfinder.auth.state" }));
    });

    expect(await screen.findByText("initial")).toBeTruthy();
    expect(screen.queryByText("old-account-draft")).toBeNull();
});
