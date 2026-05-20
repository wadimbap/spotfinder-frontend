export type UserRole = "USER" | "MODERATOR" | "ADMIN";

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    name: string;
    password: string;
    passwordConfirmation: string;
}

export interface AuthResponse {
    accessToken: string;
}

export interface CurrentUserResponse {
    id: string;
    email: string;
    displayName: string;
    role: UserRole;
}