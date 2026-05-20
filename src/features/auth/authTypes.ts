export type UserRole = "USER" | "MODERATOR" | "ADMIN";

export type ActivityType =
    | "SKATEBOARDING"
    | "SCOOTER"
    | "BMX"
    | "ROLLERBLADING";

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
    activityType: ActivityType | null;
}

export interface UpdateCurrentUserRequest {
    displayName?: string;
    activityType?: ActivityType;
}