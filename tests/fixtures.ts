import type { SpotResponse } from "../src/features/spots/spotsTypes";
import type { CurrentUserResponse } from "../src/features/auth/authTypes";

export const user: CurrentUserResponse = {
    id: "owner-id", email: "owner@example.com", displayName: "Alex",
    role: "USER", primaryActivity: "BMX",
};

export const spot: SpotResponse = {
    id: "spot-id", name: "Original spot", description: "A place to ride",
    latitude: 59.93, longitude: 30.36, type: "STREET", features: ["FLAT"],
    approved: true, createdByUserId: user.id,
    createdAt: "2026-10-25T10:00:00Z", updatedAt: "2026-10-25T10:00:00Z",
};
