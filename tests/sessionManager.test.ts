import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sessionClient } from "../src/shared/auth/sessionClient";
import {
    authenticate,
    ensureSession,
    logoutSession,
    refreshAccessToken,
    SessionChangedError,
} from "../src/shared/auth/sessionManager";
import { isAccessTokenUsable, tokenStorage } from "../src/shared/auth/tokenStorage";

vi.mock("../src/shared/auth/sessionClient", () => ({
    sessionClient: { post: vi.fn() },
}));

function token(id: string, expiresIn = 900): string {
    return `header.${btoa(JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + expiresIn,
        jti: id,
    }))}.signature`;
}

function requestId(call: number): unknown {
    return vi.mocked(sessionClient.post).mock.calls[call][2]?.headers?.["X-Refresh-Request"];
}

beforeEach(() => {
    localStorage.clear();
    vi.mocked(sessionClient.post).mockReset();
    let tail: Promise<unknown> = Promise.resolve();

    // Model the shared queue provided by Web Locks across tabs.
    vi.stubGlobal("navigator", {
        locks: {
            request: (_name: string, work: () => Promise<unknown>) => {
                const next = tail.then(work);
                tail = next.catch(() => undefined);
                return next;
            },
        },
    });
});

afterEach(() => vi.unstubAllGlobals());

describe("session lifecycle", () => {
    it("shares a refresh between simultaneous failed requests", async () => {
        tokenStorage.startSession(token("old"));
        const snapshot = tokenStorage.getSnapshot();
        const next = token("new");
        vi.mocked(sessionClient.post).mockResolvedValueOnce({ data: { accessToken: next } });

        expect(await Promise.all([
            refreshAccessToken(snapshot),
            refreshAccessToken(snapshot),
            refreshAccessToken(snapshot),
        ])).toEqual([next, next, next]);
        expect(sessionClient.post).toHaveBeenCalledTimes(1);
    });

    it.each([
        new Error("Network error"),
        { isAxiosError: true, response: { status: 500 } },
        { isAxiosError: true, response: { status: 403 } },
    ])("preserves authorization and the retry ID after a temporary error", async (error) => {
        tokenStorage.startSession(token("old"));
        const snapshot = tokenStorage.getSnapshot();
        vi.mocked(sessionClient.post).mockRejectedValueOnce(error);

        await expect(refreshAccessToken(snapshot)).rejects.toBe(error);
        const firstId = requestId(0);
        expect(tokenStorage.getSnapshot()).toEqual(snapshot);

        vi.mocked(sessionClient.post).mockResolvedValueOnce({
            data: { accessToken: token("new") },
        });
        await refreshAccessToken(snapshot);
        expect(requestId(1)).toBe(firstId);
    });

    it("clears authorization after definitive refresh rejection", async () => {
        tokenStorage.startSession(token("old"));
        vi.mocked(sessionClient.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: { status: 401 },
        });

        await expect(refreshAccessToken(tokenStorage.getSnapshot())).rejects.toBeDefined();
        expect(tokenStorage.getAccessToken()).toBeNull();
    });

    it("does not refresh a request from a previous login", async () => {
        tokenStorage.startSession(token("first"));
        const previous = tokenStorage.getSnapshot();
        tokenStorage.startSession(token("second"));

        await expect(refreshAccessToken(previous)).rejects.toBeInstanceOf(SessionChangedError);
        expect(sessionClient.post).not.toHaveBeenCalled();
        expect(tokenStorage.getAccessToken()).toBe(token("second"));
    });

    it("does not resurrect a session after logout", async () => {
        tokenStorage.startSession(token("current"));
        const previous = tokenStorage.getSnapshot();
        vi.mocked(sessionClient.post).mockResolvedValueOnce({});

        await logoutSession();
        await expect(refreshAccessToken(previous)).rejects.toBeInstanceOf(SessionChangedError);
        expect(tokenStorage.getAccessToken()).toBeNull();
        expect(sessionClient.post).toHaveBeenCalledTimes(1);
    });

    it("keeps local state when server logout cannot be confirmed", async () => {
        tokenStorage.startSession(token("current"));
        vi.mocked(sessionClient.post).mockRejectedValueOnce(new Error("Network error"));

        await expect(logoutSession()).rejects.toThrow("Network error");
        expect(tokenStorage.getAccessToken()).toBe(token("current"));
    });

    it("restores a browser session from its cookie when no access token is stored", async () => {
        vi.mocked(sessionClient.post).mockResolvedValueOnce({
            data: { accessToken: token("restored") },
        });

        expect(await ensureSession()).toBe(token("restored"));
        expect(sessionClient.post).toHaveBeenCalledWith(
            "/api/v1/auth/refresh", null,
            expect.objectContaining({ headers: expect.any(Object) }),
        );
    });

    it("preserves a valid legacy token until expiration", async () => {
        localStorage.setItem("accessToken", token("legacy"));

        expect(await ensureSession()).toBe(token("legacy"));
        expect(sessionClient.post).not.toHaveBeenCalled();
    });

    it("replaces an expired access token without changing session identity", async () => {
        tokenStorage.startSession(token("expired", -1));
        const epoch = tokenStorage.getSnapshot().epoch;
        vi.mocked(sessionClient.post).mockResolvedValueOnce({
            data: { accessToken: token("replacement") },
        });

        expect(await ensureSession()).toBe(token("replacement"));
        expect(tokenStorage.getSnapshot().epoch).toBe(epoch);
        expect(isAccessTokenUsable(token("expired", -1))).toBe(false);
    });

    it("stores the new login inside the same lock as the cookie exchange", async () => {
        vi.mocked(sessionClient.post).mockResolvedValueOnce({
            data: { accessToken: token("login") },
        });

        await authenticate("login", { email: "user@example.com", password: "password" });
        expect(tokenStorage.getAccessToken()).toBe(token("login"));
        expect(tokenStorage.getSnapshot().epoch).not.toBe("legacy");
    });
});
