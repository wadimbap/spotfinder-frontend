import { apiClient } from "../../shared/api/apiClient";
import type { CreateSpotRequest, SpotResponse } from "../spots/spotsTypes";

export const adminSpotsApi = {
    async deleteSpot(spotId: string): Promise<void> {
        await apiClient.delete(`/api/v1/admin/spots/${spotId}`);
    },

    async getSpot(spotId: string): Promise<SpotResponse> {
        const response = await apiClient.get<SpotResponse>(`/api/v1/admin/spots/${spotId}`);
        return response.data;
    },

    async createApprovedSpot(request: CreateSpotRequest): Promise<SpotResponse> {
        const response = await apiClient.post<SpotResponse>("/api/v1/admin/spots", request);
        return response.data;
    },

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
