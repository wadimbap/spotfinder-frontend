import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL;

if (!baseURL) throw new Error("VITE_API_BASE_URL is not configured");

// Separate transport: a rejected refresh must never refresh itself.
export const sessionClient = axios.create({
    baseURL,
    withCredentials: true,
    timeout: 20_000,
    headers: {
        "Content-Type": "application/json",
        "X-Auth-Request": "1",
    },
});
