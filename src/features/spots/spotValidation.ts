import type { CreateSpotRequest } from "./spotsTypes";

export function validateSpot(request: CreateSpotRequest): string {
    if (request.name.trim().length < 2 || request.name.trim().length > 255) return "Name must be between 2 and 255 characters.";
    if ((request.description?.length ?? 0) > 2000) return "Description must be at most 2000 characters.";
    if (!Number.isFinite(request.latitude) || request.latitude < -90 || request.latitude > 90) return "Latitude must be between -90 and 90.";
    if (!Number.isFinite(request.longitude) || request.longitude < -180 || request.longitude > 180) return "Longitude must be between -180 and 180.";
    if (!request.type) return "Select a spot type.";
    if (!request.features.length) return "Select at least one feature.";
    return "";
}
