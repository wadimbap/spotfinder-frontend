import type { SpotPhotoResponse } from "./spotsTypes";

export function sortSpotPhotos(photos: SpotPhotoResponse[]): SpotPhotoResponse[] {
    return [...photos].sort((a, b) => {
        const dateOrder = (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0);
        return dateOrder || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    });
}
