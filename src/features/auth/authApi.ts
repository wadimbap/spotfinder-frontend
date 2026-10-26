import { apiClient } from "../../shared/api/apiClient";
import { authenticate, logoutSession } from "../../shared/auth/sessionManager";
import type {
    AuthResponse,
    CurrentUserResponse,
    LoginRequest,
    RegisterRequest,
    UpdateCurrentUserRequest,
} from "./authTypes";

export const authApi = {
    async login(request: LoginRequest): Promise<AuthResponse> {
        return authenticate("login", request);
    },

    async register(request: RegisterRequest): Promise<AuthResponse> {
        return authenticate("register", request);
    },

    async logout(): Promise<void> {
        return logoutSession();
    },

    async getCurrentUser(): Promise<CurrentUserResponse> {
        const response = await apiClient.get<CurrentUserResponse>(
            "/api/v1/user/me",
        );

        return response.data;
    },

    async updateCurrentUser(
        request: UpdateCurrentUserRequest,
    ): Promise<CurrentUserResponse> {
        const response = await apiClient.patch<CurrentUserResponse>(
            "/api/v1/user/me",
            request,
        );

        return response.data;
    },
};
