import axios from "axios";

export function getApiStatus(error: unknown): number | undefined {
    return axios.isAxiosError(error) ? error.response?.status : undefined;
}

export function getApiError(error: unknown, fallback: string): string {
    if (!axios.isAxiosError(error)) return fallback;
    if (!error.response) return "Cannot reach the server. Check your connection and try again.";
    const { status, data } = error.response;
    if (status === 401) return "Your session has expired. Please sign in again.";
    if (status === 403) return "You do not have permission to perform this action.";
    if (status >= 500) return `${fallback} Please try again later.`;
    if (data && typeof data === "object") {
        const fields = data.fieldErrors;
        if (fields && typeof fields === "object") {
            const messages = Object.values(fields).filter((value): value is string => typeof value === "string");
            if (messages.length) return messages.join(" ");
        }
        if (typeof data.message === "string") return data.message;
    }
    return fallback;
}
