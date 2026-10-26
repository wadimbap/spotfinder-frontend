import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";

import { sessionClient } from "../auth/sessionClient";
import { invalidateSession, refreshAccessToken, SessionChangedError } from "../auth/sessionManager";
import { tokenStorage } from "../auth/tokenStorage";
import type { SessionSnapshot } from "../auth/tokenStorage";

interface SessionRequestConfig extends InternalAxiosRequestConfig {
    sessionEpoch?: string;
    sessionToken?: string | null;
    sessionRetried?: boolean;
}

export const apiClient = axios.create({
    baseURL: sessionClient.defaults.baseURL,
    headers: {
        "Content-Type": "application/json",
    },
});

apiClient.interceptors.request.use((original) => {
    const config = original as SessionRequestConfig;
    const current = tokenStorage.getSnapshot();
    config.sessionEpoch ??= current.epoch;

    if (config.sessionEpoch !== current.epoch) throw new SessionChangedError();

    config.sessionToken = current.token;
    if (current.token) {
        config.headers.set("Authorization", `Bearer ${current.token}`);
    } else {
        config.headers.delete("Authorization");
    }

    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
        if (!axios.isAxiosError(error) || error.response?.status !== 401) throw error;

        const config = error.config as SessionRequestConfig | undefined;
        if (!config || config.url?.startsWith("/api/v1/auth/")) throw error;

        const expected: SessionSnapshot = {
            epoch: config.sessionEpoch ?? "legacy",
            token: config.sessionToken ?? null,
        };

        if (config.sessionRetried) {
            await invalidateSession(expected);
            throw error;
        }

        config.sessionRetried = true;
        await refreshAccessToken(expected);
        return apiClient.request(config);
    },
);
