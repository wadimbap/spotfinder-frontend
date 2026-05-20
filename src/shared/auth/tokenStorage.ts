const ACCESS_TOKEN_KEY = "accessToken";

export const tokenStorage = {
    getAccessToken(): string | null {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    },

    setAccessToken(token: string): void {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
    },

    removeAccessToken(): void {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
    },

    hasAccessToken(): boolean {
        return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
    },
};