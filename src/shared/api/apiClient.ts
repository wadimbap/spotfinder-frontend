import axios from "axios";
import { tokenStorage } from "../auth/tokenStorage";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? "http://stage-api.deployflow.ru";

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

apiClient.interceptors.request.use((config) => {
    const token = tokenStorage.getAccessToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});