import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

import "../../shared/map/leafletIcon";
import type { SpotResponse } from "./spotsTypes";

interface SpotsMapProps {
    spots: SpotResponse[];
}

const DEFAULT_CENTER: [number, number] = [52.52, 13.405];

export function SpotsMap({ spots }: SpotsMapProps) {
    const center: [number, number] =
        spots.length > 0
            ? [spots[0].latitude, spots[0].longitude]
            : DEFAULT_CENTER;

    return (
        <div className="map-wrapper">
            <MapContainer center={center} zoom={11} className="map-container">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {spots.map((spot) => (
                    <Marker
                        key={spot.id}
                        position={[spot.latitude, spot.longitude]}
                    >
                        <Popup>
                            <strong>{spot.name}</strong>
                            <br />
                            {spot.type}
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}