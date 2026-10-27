import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { getSpotMarkerIcon } from "../../shared/map/spotMarkerIcon";
import { getUserLocationMarkerIcon } from "../../shared/map/userLocationMarkerIcon";
import {
    toMapCoordinates,
    USER_LOCATION_OPTIONS,
    type MapCoordinates,
} from "../../shared/map/userLocation";
import {
    MapContainer,
    Marker,
    useMap,
    useMapEvents,
    ZoomControl,
} from "react-leaflet";

import "../../shared/map/leafletIcon";
import { MapTileLayer } from "../../shared/map/MapTileLayer";
import { hasCartoBasemap } from "../../shared/map/mapTiles";
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

function InitialUserPositionCenter({ position }: { position: MapCoordinates | null }) {
    const map = useMap();
    const hasCentered = useRef(false);

    useEffect(() => {
        if (!position || hasCentered.current) {
            return;
        }

        hasCentered.current = true;
        map.setView(position, 15, { animate: false });
    }, [map, position]);

    return null;
}

function FollowUserPosition({
    position,
    enabled,
}: {
    position: MapCoordinates | null;
    enabled: boolean;
}) {
    const map = useMap();

    useEffect(() => {
        if (enabled && position) {
            map.panTo(position, { animate: true });
        }
    }, [enabled, map, position]);

    return null;
}

interface MapClickHandlerProps extends Pick<SpotsMapProps, "creating" | "onMapClick"> {
    onManualMapInteraction: () => void;
}

function MapClickHandler({
                              creating,
                              onMapClick,
                              onManualMapInteraction,
                          }: MapClickHandlerProps) {
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
        dragstart() {
            onManualMapInteraction();
        },
        zoomstart() {
            onManualMapInteraction();
        },
    });

    return null;
}

function UserLocationControl({
    following,
    onLocate,
}: {
    following: boolean;
    onLocate: () => void;
}) {
    const map = useMap();

    useEffect(() => {
        const control = new L.Control({ position: "bottomright" });
        control.onAdd = () => {
            const container = L.DomUtil.create(
                "div",
                "leaflet-control leaflet-bar user-location-control",
            );
            const button = L.DomUtil.create(
                "button",
                "user-location-button",
                container,
            ) as HTMLButtonElement;

            button.type = "button";
            button.textContent = "⌖";
            button.title = following
                ? "Following your location"
                : "Center on my location";
            button.setAttribute("aria-label", button.title);
            button.setAttribute("aria-pressed", String(following));

            L.DomEvent.on(button, "click", (event) => {
                L.DomEvent.stop(event);
                onLocate();
            });

            return container;
        };

        control.addTo(map);
        return () => {
            control.remove();
        };
    }, [following, map, onLocate]);

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
    const [userPosition, setUserPosition] = useState<MapCoordinates | null>(null);
    const [followingUser, setFollowingUser] = useState(false);
    const watchId = useRef<number | null>(null);

    const updateUserPosition = useCallback((position: GeolocationPosition) => {
        setUserPosition(toMapCoordinates(position));
    }, []);

    const reportGeolocationError = useCallback((error: GeolocationPositionError) => {
        console.warn("Geolocation is not available", error);
    }, []);

    const requestCurrentPosition = useCallback((onError = reportGeolocationError) => {
        if (!navigator.geolocation) {
            return;
        }

        navigator.geolocation.getCurrentPosition(
            updateUserPosition,
            onError,
            USER_LOCATION_OPTIONS,
        );
    }, [reportGeolocationError, updateUserPosition]);

    useEffect(() => {
        if (!navigator.geolocation) {
            return;
        }

        watchId.current = navigator.geolocation.watchPosition(
            updateUserPosition,
            (error) => {
                setFollowingUser(false);
                reportGeolocationError(error);
            },
            USER_LOCATION_OPTIONS,
        );

        return () => {
            if (watchId.current !== null) {
                navigator.geolocation.clearWatch(watchId.current);
                watchId.current = null;
            }
        };
    }, [reportGeolocationError, updateUserPosition]);

    const handleLocate = useCallback(() => {
        if (!navigator.geolocation) {
            return;
        }

        setFollowingUser(true);
        requestCurrentPosition((error) => {
            setFollowingUser(false);
            reportGeolocationError(error);
        });
    }, [reportGeolocationError, requestCurrentPosition]);

    const handleManualMapInteraction = useCallback(() => {
        setFollowingUser(false);
    }, []);

    const mapCenter = useMemo<[number, number]>(() => {
        if (spots.length > 0) {
            return [spots[0].latitude, spots[0].longitude];
        }

        return DEFAULT_CITY_CENTER;
    }, [spots]);

    return (
        <MapContainer
            center={mapCenter}
            zoom={11}
            className={`spots-full-map${hasCartoBasemap() ? " carto-basemap" : ""}`}
            zoomControl={false}
            preferCanvas
            fadeAnimation={false}
            markerZoomAnimation={false}
            zoomAnimation={false}
        >
            <MapTileLayer updateWhenIdle updateWhenZooming={false} keepBuffer={1} />

            <ZoomControl position="bottomright" />
            <RemoveLeafletPrefix />
            <MapCenterUpdater center={mapCenter} />
            <InitialUserPositionCenter position={userPosition} />
            <FollowUserPosition position={userPosition} enabled={followingUser} />
            <MapClickHandler
                creating={creating}
                onMapClick={onMapClick}
                onManualMapInteraction={handleManualMapInteraction}
            />
            <UserLocationControl following={followingUser} onLocate={handleLocate} />

            {spots.map((spot) => (
                <Marker
                    key={spot.id}
                    title={spot.name}
                    alt={spot.name}
                    position={[spot.latitude, spot.longitude]}
                    icon={getSpotMarkerIcon(spot.approved)}
                    eventHandlers={{
                        click: () => onSpotClick(spot),
                    }}
                />
            ))}

            {draftLocation && <Marker position={draftLocation} />}
            {userPosition && (
                <Marker
                    position={userPosition}
                    icon={getUserLocationMarkerIcon()}
                    title="Your location"
                    alt="Your location"
                    interactive={false}
                />
            )}
        </MapContainer>
    );
}
