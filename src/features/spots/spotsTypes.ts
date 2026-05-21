export type SpotType = "STREET" | "SKATEPARK";

export type SpotFeature =
    | "FLAT"
    | "RAIL"
    | "LEDGE"
    | "STAIRS"
    | "GAP"
    | "BANK"
    | "MANUAL_PAD"
    | "MINI_RAMP"
    | "HALFPIPE"
    | "QUARTER_PIPE"
    | "FUNBOX"
    | "PYRAMID"
    | "BOWL"
    | "CURB"
    | "WALLRIDE"
    | "LIGHTING"
    | "COVERED"
    | "OTHER";

export interface SpotResponse {
    id: string;
    name: string;
    description: string | null;
    latitude: number;
    longitude: number;
    type: SpotType;
    features: SpotFeature[];
    approved: boolean;
    createdByUserId: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSpotRequest {
    name: string;
    description: string | null;
    latitude: number;
    longitude: number;
    type: SpotType;
    features: SpotFeature[];
}

export interface SpotMetadataResponse {
    types: SpotType[];
    features: SpotFeature[];
}

export interface SpotPhotoResponse {
    id: string;
    spotId: string;
    originalFilename: string;
    contentType: string;
    sizeBytes: number;
    createdByUserId: string;
    createdAt: string;
}
