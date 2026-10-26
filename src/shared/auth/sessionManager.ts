import axios from "axios";

import { sessionClient } from "./sessionClient";
import { isAccessTokenUsable, tokenStorage } from "./tokenStorage";
import type { SessionSnapshot } from "./tokenStorage";

const LOCK_NAME = "spotfinder-auth";
const PENDING_REFRESH_KEY = "spotfinder.auth.pending-refresh";

interface AuthResult {
    accessToken: string;
}

interface PendingRefresh {
    epoch: string;
    requestId: string;
}

export class SessionChangedError extends Error {
    constructor() {
        super("The session changed while the request was running");
    }
}

function withSessionLock<T>(work: () => Promise<T>): Promise<T> {
    if (!navigator.locks) {
        return Promise.reject(
            new Error("This browser requires HTTPS and Web Locks support"),
        );
    }

    return navigator.locks.request(LOCK_NAME, work);
}

function pendingRequestId(epoch: string): string {
    const stored = localStorage.getItem(PENDING_REFRESH_KEY);

    if (stored) {
        try {
            const pending = JSON.parse(stored) as Partial<PendingRefresh>;

            if (pending.epoch === epoch && typeof pending.requestId === "string") {
                return pending.requestId;
            }
        } catch {
            // Replace a malformed pending request.
        }
    }

    const requestId = crypto.randomUUID();
    localStorage.setItem(
        PENDING_REFRESH_KEY,
        JSON.stringify({ epoch, requestId } satisfies PendingRefresh),
    );
    return requestId;
}

function clearPending(): void {
    localStorage.removeItem(PENDING_REFRESH_KEY);
}

export async function authenticate(
    action: "login" | "register",
    body: unknown,
): Promise<AuthResult> {
    return withSessionLock(async () => {
        const response = await sessionClient.post<AuthResult>(
            `/api/v1/auth/${action}`,
            body,
        );

        clearPending();
        tokenStorage.startSession(response.data.accessToken);
        return response.data;
    });
}

export async function refreshAccessToken(expected: SessionSnapshot): Promise<string> {
    return withSessionLock(async () => {
        const current = tokenStorage.getSnapshot();

        if (current.epoch !== expected.epoch) throw new SessionChangedError();

        // Another request or tab has already replaced the failed access token.
        if (current.token !== expected.token && isAccessTokenUsable(current.token)) {
            return current.token!;
        }

        const requestId = pendingRequestId(current.epoch);

        try {
            const response = await sessionClient.post<AuthResult>(
                "/api/v1/auth/refresh",
                null,
                { headers: { "X-Refresh-Request": requestId } },
            );

            if (typeof response.data.accessToken !== "string" || !response.data.accessToken) {
                throw new Error("Invalid refresh response");
            }
            if (tokenStorage.getSnapshot().epoch !== current.epoch) {
                throw new SessionChangedError();
            }

            clearPending();
            tokenStorage.setAccessToken(response.data.accessToken);
            return response.data.accessToken;
        } catch (error) {
            if (
                axios.isAxiosError(error) &&
                error.response?.status === 401 &&
                tokenStorage.getSnapshot().epoch === current.epoch
            ) {
                clearPending();
                tokenStorage.removeAccessToken();
            }

            // Preserve state and the idempotency key on network errors and 5xx.
            throw error;
        }
    });
}

export async function ensureSession(): Promise<string> {
    const current = tokenStorage.getSnapshot();
    return isAccessTokenUsable(current.token) ? current.token! : refreshAccessToken(current);
}

export async function invalidateSession(expected: SessionSnapshot): Promise<void> {
    return withSessionLock(async () => {
        const current = tokenStorage.getSnapshot();

        if (current.epoch === expected.epoch && current.token === expected.token) {
            clearPending();
            tokenStorage.removeAccessToken();
        }
    });
}

export async function logoutSession(): Promise<void> {
    const expected = tokenStorage.getSnapshot();

    return withSessionLock(async () => {
        if (tokenStorage.getSnapshot().epoch !== expected.epoch) throw new SessionChangedError();

        await sessionClient.post("/api/v1/auth/logout");
        clearPending();
        tokenStorage.removeAccessToken();
    });
}
