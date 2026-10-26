const STATE_KEY = "spotfinder.auth.state";
const LEGACY_TOKEN_KEY = "accessToken";

export const AUTH_CHANGED_EVENT = "spotfinder-auth-changed";

export interface SessionSnapshot {
    token: string | null;
    epoch: string;
}

function read(): SessionSnapshot {
    const stored = localStorage.getItem(STATE_KEY);

    if (stored) {
        try {
            const state = JSON.parse(stored) as Partial<SessionSnapshot>;

            if (
                typeof state.epoch === "string" &&
                (state.token === null || typeof state.token === "string")
            ) {
                return state as SessionSnapshot;
            }
        } catch {
            // Older clients stored a plain access token.
        }
    }

    return { token: localStorage.getItem(LEGACY_TOKEN_KEY), epoch: "legacy" };
}

function write(state: SessionSnapshot): void {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export const tokenStorage = {
    getSnapshot: read,

    getAccessToken(): string | null {
        return read().token;
    },

    hasAccessToken(): boolean {
        return Boolean(read().token);
    },

    startSession(token: string): void {
        write({ token, epoch: crypto.randomUUID() });
    },

    setAccessToken(token: string): void {
        write({ token, epoch: read().epoch });
    },

    removeAccessToken(): void {
        if (read().token === null && localStorage.getItem(STATE_KEY)) return;

        write({ token: null, epoch: crypto.randomUUID() });
    },
};

export function isAccessTokenUsable(token: string | null): boolean {
    if (!token) return false;

    try {
        const payload = token.split(".")[1];
        const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(
            normalized.length + ((4 - normalized.length % 4) % 4),
            "=",
        );
        const claims = JSON.parse(atob(padded)) as { exp?: unknown };

        return typeof claims.exp === "number" && claims.exp > Date.now() / 1000 + 5;
    } catch {
        return false;
    }
}
