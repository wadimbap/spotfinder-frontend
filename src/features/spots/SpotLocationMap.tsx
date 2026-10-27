import { MapContainer, Marker } from "react-leaflet";

import { getSpotMarkerIcon } from "../../shared/map/spotMarkerIcon";
import { MapTileLayer } from "../../shared/map/MapTileLayer";
import { getMapTileConfig, hasCartoBasemap } from "../../shared/map/mapTiles";
import { useTheme } from "../../shared/theme/theme";

interface SpotLocationMapProps {
    latitude: number;
    longitude: number;
    spotName: string;
}

export function SpotLocationMap({ latitude, longitude, spotName }: SpotLocationMapProps) {
    const center: [number, number] = [latitude, longitude];
    const { resolvedTheme } = useTheme();
    const { usesCarto } = getMapTileConfig(resolvedTheme);

    return (
        <section className="spot-location-map-section" aria-labelledby="spot-location-map-heading">
            <h2 id="spot-location-map-heading">Location on map</h2>
            <MapContainer
                aria-label={`Location of ${spotName}`}
                center={center}
                className={`spot-location-map${hasCartoBasemap() ? " carto-basemap" : ""}`}
                attributionControl={false}
                dragging={false}
                doubleClickZoom={false}
                keyboard={false}
                scrollWheelZoom={false}
                touchZoom={false}
                zoom={16}
                zoomControl={false}
            >
                <MapTileLayer />
                <Marker icon={getSpotMarkerIcon(false)} position={center} />
            </MapContainer>
            <p className="spot-location-map-attribution"><a href="https://www.openstreetmap.org/copyright">© OSM</a>
                {usesCarto && <> · <a href="https://carto.com/attribution/">CARTO</a></>}</p>
        </section>
    );
}
