import { MapContainer, Marker, useMapEvents } from "react-leaflet";
import "../../shared/map/leafletIcon";
import { MapTileLayer } from "../../shared/map/MapTileLayer";
import { hasCartoBasemap } from "../../shared/map/mapTiles";

interface Props { location: [number, number]; onChange: (location: [number, number]) => void; disabled?: boolean }

function ClickPicker({ onChange, disabled }: Pick<Props, "onChange" | "disabled">) {
    useMapEvents({ click: (event) => {
        if (disabled) return;
        const latitude = Math.max(-90, Math.min(90, event.latlng.lat));
        const longitude = ((event.latlng.lng + 180) % 360 + 360) % 360 - 180;
        onChange([Number(latitude.toFixed(6)), Number(longitude.toFixed(6))]);
    } });
    return null;
}

export function LocationPicker({ location, onChange, disabled }: Props) {
    return <div className="location-picker" aria-label="Choose spot location on map">
        <MapContainer center={location} zoom={15} className={`map-container${hasCartoBasemap() ? " carto-basemap" : ""}`}>
            <MapTileLayer />
            <Marker position={location} />
            <ClickPicker onChange={onChange} disabled={disabled} />
        </MapContainer>
    </div>;
}
