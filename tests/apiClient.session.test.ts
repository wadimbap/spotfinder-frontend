import axios, { AxiosError, AxiosHeaders } from "axios";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { apiClient } from "../src/shared/api/apiClient";
import { sessionClient } from "../src/shared/auth/sessionClient";
import { tokenStorage } from "../src/shared/auth/tokenStorage";

const originalAdapter = apiClient.defaults.adapter;

function rejectRequest(config: InternalAxiosRequestConfig, status: number): never {
    throw new AxiosError("Rejected", "ERR_BAD_RESPONSE", config, undefined, {
        status, statusText: "Rejected", config, headers: new AxiosHeaders(), data: {},
    });
}

beforeEach(() => {
    localStorage.clear();
    tokenStorage.startSession("old-token");
    let tail: Promise<unknown> = Promise.resolve();
    vi.stubGlobal("navigator", { locks: {
        request: (_name: string, work: () => Promise<unknown>) => {
            const next = tail.then(work);
            tail = next.catch(() => undefined);
            return next;
        },
    } });
});

afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

it("retries a protected mutation once with the new token and original body", async () => {
    const requests: InternalAxiosRequestConfig[] = [];
    apiClient.defaults.adapter = (async (config) => {
        requests.push(config);
        if (requests.length === 1) rejectRequest(config, 401);
        return { status: 200, statusText: "OK", data: { saved: true }, headers: {}, config };
    }) satisfies AxiosAdapter;
    const refresh = vi.spyOn(sessionClient, "post").mockResolvedValueOnce({
        data: { accessToken: "new-token" },
    });

    const response = await apiClient.post("/api/v1/spots", { name: "Keep this body" });

    expect(response.data).toEqual({ saved: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(requests).toHaveLength(2);
    expect(requests[1].headers.get("Authorization")).toBe("Bearer new-token");
    expect(requests[1].data).toBe(JSON.stringify({ name: "Keep this body" }));
});

it("stops after a second 401 and clears only the rejected session", async () => {
    let requests = 0;
    apiClient.defaults.adapter = async (config) => {
        requests++;
        return rejectRequest(config, 401);
    };
    const refresh = vi.spyOn(sessionClient, "post").mockResolvedValueOnce({
        data: { accessToken: "new-token" },
    });

    await expect(apiClient.get("/api/v1/user/me")).rejects.toSatisfy(axios.isAxiosError);

    expect(requests).toBe(2);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(tokenStorage.getAccessToken()).toBeNull();
});

it.each([403, 500])("does not refresh or clear authorization after %s", async (status) => {
    apiClient.defaults.adapter = async (config) => rejectRequest(config, status);
    const refresh = vi.spyOn(sessionClient, "post");

    await expect(apiClient.get("/api/v1/user/me")).rejects.toBeDefined();

    expect(refresh).not.toHaveBeenCalled();
    expect(tokenStorage.getAccessToken()).toBe("old-token");
});

it("does not replay an old mutation after another account signs in", async () => {
    apiClient.defaults.adapter = async (config) => {
        tokenStorage.startSession("another-account");
        return rejectRequest(config, 401);
    };
    const refresh = vi.spyOn(sessionClient, "post");

    await expect(apiClient.post("/api/v1/spots", { name: "Old account" }))
        .rejects.toThrow("The session changed");

    expect(refresh).not.toHaveBeenCalled();
    expect(tokenStorage.getAccessToken()).toBe("another-account");
});
