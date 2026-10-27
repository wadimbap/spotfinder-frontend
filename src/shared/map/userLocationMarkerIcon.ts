import L from "leaflet";

export function getUserLocationMarkerIcon() {
    return L.divIcon({
        className: "user-location-marker-icon",
        html: '<span class="user-location-marker"><span></span></span>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
}
