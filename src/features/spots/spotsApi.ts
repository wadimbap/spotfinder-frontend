import { apiClient } from "../../shared/api/apiClient";
import type {
    CreateSpotRequest,
    SpotMetadataResponse,
    SpotResponse,
} from "./spotsTypes";

export const spotsApi = {
    async getMetadata(): Promise<SpotMetadataResponse> {
        const response = await apiClient.get<SpotMetadataResponse>(
            "/api/v1/spot-metadata",
        );

        return response.data;
    },

    async getApprovedSpots(): Promise<SpotResponse[]> {
        const response = await apiClient.get<SpotResponse[]>("/api/v1/spots");

        return response.data;
    },

    async createSpot(request: CreateSpotRequest): Promise<SpotResponse> {
        const response = await apiClient.post<SpotResponse>(
            "/api/v1/spots",
            request,
        );

        return response.data;
    },
};
