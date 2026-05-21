import { apiClient } from "../../shared/api/apiClient";
import type { SpotResponse } from "../spots/spotsTypes";

export const adminSpotsApi = {
    async getPendingSpots(): Promise<SpotResponse[]> {
        const response = await apiClient.get<SpotResponse[]>(
            "/api/v1/admin/spots/pending",
        );

        return response.data;
    },

    async approveSpot(spotId: string): Promise<SpotResponse> {
        const response = await apiClient.post<SpotResponse>(
            `/api/v1/admin/spots/${spotId}/approve`,
        );

        return response.data;
    },

    async rejectSpot(spotId: string): Promise<void> {
        await apiClient.post(`/api/v1/admin/spots/${spotId}/reject`);
    },
};
