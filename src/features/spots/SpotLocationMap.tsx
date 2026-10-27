import { MapContainer, Marker, TileLayer } from "react-leaflet";

import { getSpotMarkerIcon } from "../../shared/map/spotMarkerIcon";

interface SpotLocationMapProps {
    latitude: number;
    longitude: number;
    spotName: string;
}

export function SpotLocationMap({ latitude, longitude, spotName }: SpotLocationMapProps) {
    const center: [number, number] = [latitude, longitude];

    return (
        <section className="spot-location-map-section" aria-labelledby="spot-location-map-heading">
            <h2 id="spot-location-map-heading">Location on map</h2>
            <MapContainer
                aria-label={`Location of ${spotName}`}
                center={center}
                className="spot-location-map"
                dragging={false}
                doubleClickZoom={false}
                keyboard={false}
                scrollWheelZoom={false}
                touchZoom={false}
                zoom={16}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker icon={getSpotMarkerIcon(false)} position={center} />
            </MapContainer>
        </section>
    );
}
