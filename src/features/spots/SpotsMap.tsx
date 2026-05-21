import { useEffect, useMemo, useState } from "react";
import { getSpotMarkerIcon } from "../../shared/map/spotMarkerIcon";
import {
    MapContainer,
    Marker,
    TileLayer,
    useMap,
    useMapEvents,
    ZoomControl,
} from "react-leaflet";

import "../../shared/map/leafletIcon";
import type { SpotResponse } from "./spotsTypes";

interface SpotsMapProps {
    spots: SpotResponse[];
    draftLocation: [number, number] | null;
    creating: boolean;
    onMapClick: (latitude: number, longitude: number) => void;
    onSpotClick: (spot: SpotResponse) => void;
}

const DEFAULT_CITY_CENTER: [number, number] = [59.9311, 30.3609];

function MapCenterUpdater({ center }: { center: [number, number] }) {
    const map = useMap();

    useEffect(() => {
        map.setView(center, 11, {
            animate: false,
        });
    }, [center, map]);

    return null;
}

function MapClickHandler({
                             creating,
                             onMapClick,
                         }: Pick<SpotsMapProps, "creating" | "onMapClick">) {
    useMapEvents({
        click(event) {
            if (!creating) {
                return;
            }

            onMapClick(
                Number(event.latlng.lat.toFixed(6)),
                Number(event.latlng.lng.toFixed(6)),
            );
        },
    });

    return null;
}

function RemoveLeafletPrefix() {
    const map = useMap();

    useEffect(() => {
        map.attributionControl.setPrefix(false);
    }, [map]);

    return null;
}

export function SpotsMap({
                             spots,
                             draftLocation,
                             creating,
                             onMapClick,
                             onSpotClick,
                         }: SpotsMapProps) {
    const [userCenter, setUserCenter] = useState<[number, number] | null>(null);

    useEffect(() => {
        if (!navigator.geolocation) {
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserCenter([
                    Number(position.coords.latitude.toFixed(6)),
                    Number(position.coords.longitude.toFixed(6)),
                ]);
            },
            (error) => {
                console.warn("Geolocation is not available", error);
            },
            {
                enableHighAccuracy: false,
                timeout: 3000,
                maximumAge: 300000,
            },
        );
    }, []);

    const mapCenter = useMemo<[number, number]>(() => {
        if (userCenter) {
            return userCenter;
        }

        if (spots.length > 0) {
            return [spots[0].latitude, spots[0].longitude];
        }

        return DEFAULT_CITY_CENTER;
    }, [spots, userCenter]);

    return (
        <MapContainer
            center={mapCenter}
            zoom={11}
            className="spots-full-map"
            zoomControl={false}
            preferCanvas
            fadeAnimation={false}
            markerZoomAnimation={false}
            zoomAnimation={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                updateWhenIdle
                updateWhenZooming={false}
                keepBuffer={1}
            />

            <ZoomControl position="topright" />
            <RemoveLeafletPrefix />
            <MapCenterUpdater center={mapCenter} />
            <MapClickHandler creating={creating} onMapClick={onMapClick} />

            {spots.map((spot) => (
                <Marker
                    key={spot.id}
                    position={[spot.latitude, spot.longitude]}
                    icon={getSpotMarkerIcon(spot.approved)}
                    eventHandlers={{
                        click: () => onSpotClick(spot),
                    }}
                />
            ))}

            {draftLocation && <Marker position={draftLocation} />}
        </MapContainer>
    );
}
