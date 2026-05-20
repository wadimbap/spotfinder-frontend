import { apiClient } from "../../shared/api/apiClient";
import type {
    AuthResponse,
    CurrentUserResponse,
    LoginRequest,
    RegisterRequest,
} from "./authTypes";

export const authApi = {
    async login(request: LoginRequest): Promise<AuthResponse> {
        const response = await apiClient.post<AuthResponse>(
            "/api/v1/auth/login",
            request,
        );

        return response.data;
    },

    async register(request: RegisterRequest): Promise<AuthResponse> {
        const response = await apiClient.post<AuthResponse>(
            "/api/v1/auth/register",
            request,
        );

        return response.data;
    },

    async getCurrentUser(): Promise<CurrentUserResponse> {
        const response = await apiClient.get<CurrentUserResponse>(
            "/api/v1/user/me",
        );

        return response.data;
    },
};