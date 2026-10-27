export type MapCoordinates = [number, number];

export const USER_LOCATION_OPTIONS: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
};

export function toMapCoordinates(position: GeolocationPosition): MapCoordinates {
    return [
        Number(position.coords.latitude.toFixed(6)),
        Number(position.coords.longitude.toFixed(6)),
    ];
}

