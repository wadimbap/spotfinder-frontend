import L from "leaflet";

export function getSpotMarkerIcon(approved: boolean) {
    return L.divIcon({
        className: "spot-marker-icon",
        html: `
      <span class="spot-marker-pin ${
            approved ? "spot-marker-pin-approved" : "spot-marker-pin-pending"
        }"></span>
    `,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30],
    });
}