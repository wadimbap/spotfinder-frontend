import { apiClient } from "../../shared/api/apiClient";
import type {
    CreateSpotRequest,
    SpotMetadataResponse,
    SpotPhotoResponse,
    SpotResponse,
} from "./spotsTypes";

export const spotsApi = {
    async getApprovedSpots(): Promise<SpotResponse[]> {
        const response = await apiClient.get<SpotResponse[]>("/api/v1/spots");

        return response.data;
    },

    async getMetadata(): Promise<SpotMetadataResponse> {
        const response = await apiClient.get<SpotMetadataResponse>(
            "/api/v1/spots/metadata",
        );

        return response.data;
    },

    async createSpot(request: CreateSpotRequest): Promise<SpotResponse> {
        const response = await apiClient.post<SpotResponse>(
            "/api/v1/spots",
            request,
        );

        return response.data;
    },

    async uploadSpotPhoto(
        spotId: string,
        file: File,
    ): Promise<SpotPhotoResponse> {
        const formData = new FormData();
        formData.append("file", file);

        const response = await apiClient.post<SpotPhotoResponse>(
            `/api/v1/spots/${spotId}/photos`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            },
        );

        return response.data;
    },

    async getSpotPhotos(spotId: string): Promise<SpotPhotoResponse[]> {
        const response = await apiClient.get<SpotPhotoResponse[]>(
            `/api/v1/spots/${spotId}/photos`,
        );

        return response.data;
    },

    async getSpotPhotoContent(spotId: string, photoId: string): Promise<Blob> {
        const response = await apiClient.get<Blob>(
            `/api/v1/spots/${spotId}/photos/${photoId}/content`,
            {
                responseType: "blob",
            },
        );

        return response.data;
    },

    async deleteSpotPhoto(spotId: string, photoId: string): Promise<void> {
        await apiClient.delete(`/api/v1/spots/${spotId}/photos/${photoId}`);
    },
};
