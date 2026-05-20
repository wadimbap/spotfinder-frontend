import { useEffect } from "react";
import {
    MapContainer,
    Marker,
    TileLayer,
    useMap,
    useMapEvents,
    ZoomControl,
} from "react-leaflet";

import "../../shared/map/leafletIcon";

interface SpotLocationPickerProps {
    latitude: number | null;
    longitude: number | null;
    center: [number, number];
    onChange: (latitude: number, longitude: number) => void;
}

function MapClickHandler({
                             onChange,
                         }: Pick<SpotLocationPickerProps, "onChange">) {
    useMapEvents({
        click(event) {
            onChange(event.latlng.lat, event.latlng.lng);
        },
    });

    return null;
}

function MapCenterUpdater({ center }: { center: [number, number] }) {
    const map = useMap();

    useEffect(() => {
        map.setView(center, 12, {
            animate: false,
        });
    }, [center, map]);

    return null;
}

function RemoveLeafletPrefix() {
    const map = useMap();

    useEffect(() => {
        map.attributionControl.setPrefix(false);
    }, [map]);

    return null;
}

export function SpotLocationPicker({
                                       latitude,
                                       longitude,
                                       center,
                                       onChange,
                                   }: SpotLocationPickerProps) {
    const markerPosition: [number, number] | null =
        latitude !== null && longitude !== null ? [latitude, longitude] : null;

    return (
        <MapContainer
            center={center}
            zoom={11}
            className="create-spot-map"
            zoomControl={false}
            preferCanvas
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                updateWhenIdle
                updateWhenZooming={false}
                keepBuffer={2}
            />

            <ZoomControl position="topright" />
            <RemoveLeafletPrefix />
            <MapCenterUpdater center={center} />
            <MapClickHandler onChange={onChange} />

            {markerPosition && <Marker position={markerPosition} />}
        </MapContainer>
    );
}
