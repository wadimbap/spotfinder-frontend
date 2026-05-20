export type SpotTypeCode = string;

export type SpotFeatureCode = string;

export interface SpotMetadataResponse {
    types: SpotTypeCode[];
    features: SpotFeatureCode[];
}

export interface SpotResponse {
    id: string;
    name: string;
    description: string | null;
    latitude: number;
    longitude: number;
    type: SpotTypeCode;
    features: SpotFeatureCode[];
    approved: boolean;
}

export interface CreateSpotRequest {
    name: string;
    description: string | null;
    latitude: number;
    longitude: number;
    type: SpotTypeCode;
    features: SpotFeatureCode[];
}
