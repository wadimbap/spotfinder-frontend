import {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";

import {SpotLocationPicker} from "./SpotLocationPicker";
import {spotsApi} from "./spotsApi";
import type {SpotMetadataResponse} from "./spotsTypes";

const DEFAULT_CITY_CENTER: [number, number] = [59.9311, 30.3609];

function formatEnumLabel(value: string): string {
    return value
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export function CreateSpotPage() {
    const navigate = useNavigate();

    const [metadata, setMetadata] = useState<SpotMetadataResponse | null>(null);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState("");
    const [features, setFeatures] = useState<string[]>([]);
    const [selectedFeature, setSelectedFeature] = useState("");

    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [mapCenter, setMapCenter] =
        useState<[number, number]>(DEFAULT_CITY_CENTER);

    const [loading, setLoading] = useState(false);
    const [metadataLoading, setMetadataLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const availableFeatures = useMemo(() => {
        if (!metadata) {
            return [];
        }

        return metadata.features.filter((feature) => !features.includes(feature));
    }, [metadata, features]);

    const effectiveSelectedFeature =
        selectedFeature && availableFeatures.includes(selectedFeature)
            ? selectedFeature
            : availableFeatures[0] ?? "";

    useEffect(() => {
        async function loadMetadata() {
            try {
                const response = await spotsApi.getMetadata();

                setMetadata(response);

                if (response.types.length > 0) {
                    setType(response.types[0]);
                }
            } catch (error) {
                console.error(error);
                setErrorMessage("Failed to load spot metadata");
            } finally {
                setMetadataLoading(false);
            }
        }

        void loadMetadata();
    }, []);

    useEffect(() => {
        if (!navigator.geolocation) {
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userCenter: [number, number] = [
                    Number(position.coords.latitude.toFixed(6)),
                    Number(position.coords.longitude.toFixed(6)),
                ];

                setMapCenter(userCenter);
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

    function handleLocationChange(nextLatitude: number, nextLongitude: number) {
        const roundedLatitude = Number(nextLatitude.toFixed(6));
        const roundedLongitude = Number(nextLongitude.toFixed(6));

        setLatitude(roundedLatitude);
        setLongitude(roundedLongitude);
    }

    function handleAddFeature() {
        if (!effectiveSelectedFeature) {
            return;
        }

        setFeatures((currentFeatures) => {
            if (currentFeatures.includes(effectiveSelectedFeature)) {
                return currentFeatures;
            }

            return [...currentFeatures, effectiveSelectedFeature];
        });

        setSelectedFeature("");
    }

    function handleRemoveFeature(feature: string) {
        setFeatures((currentFeatures) =>
            currentFeatures.filter((item) => item !== feature),
        );
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (latitude === null || longitude === null) {
            setErrorMessage("Select spot location on the map");
            return;
        }

        if (!type) {
            setErrorMessage("Select spot type");
            return;
        }

        try {
            setLoading(true);
            setErrorMessage("");

            await spotsApi.createSpot({
                name: name.trim(),
                description: description.trim() ? description.trim() : null,
                latitude,
                longitude,
                type,
                features,
            });

            navigate("/spots");
        } catch (error) {
            console.error(error);
            setErrorMessage("Failed to create spot");
        } finally {
            setLoading(false);
        }
    }

    if (metadataLoading) {
        return <p className="page-message">Loading spot metadata...</p>;
    }

    return (
        <div className="create-spot-page">
            <SpotLocationPicker
                latitude={latitude}
                longitude={longitude}
                center={mapCenter}
                onChange={handleLocationChange}
            />

            <section className="create-spot-panel">
                <h1>Add spot</h1>

                <form onSubmit={handleSubmit}>
                    <div className="form-field">
                        <label htmlFor="name">Name</label>
                        <input
                            id="name"
                            type="text"
                            placeholder="Spot name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            required
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            placeholder="Short description"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="type">Type</label>
                        <select
                            id="type"
                            value={type}
                            onChange={(event) => setType(event.target.value)}
                            required
                        >
                            {metadata?.types.map((spotType) => (
                                <option key={spotType} value={spotType}>
                                    {formatEnumLabel(spotType)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-field">
                        <div className="location-label-row">
                            <label>Location</label>

                            <div className="coordinates-inline">
                                <span>Lat: {latitude ?? "—"}</span>
                                <span>Lng: {longitude ?? "—"}</span>
                            </div>
                        </div>

                        <p className="field-help">Click on the map to choose spot location.</p>
                    </div>

                    <div className="form-field">
                        <label htmlFor="feature">Features</label>

                        <div className="feature-select-row">
                            <select
                                id="feature"
                                value={effectiveSelectedFeature}
                                onChange={(event) => setSelectedFeature(event.target.value)}
                                disabled={availableFeatures.length === 0}
                            >
                                {availableFeatures.map((feature) => (
                                    <option key={feature} value={feature}>
                                        {formatEnumLabel(feature)}
                                    </option>
                                ))}
                            </select>

                            <button
                                type="button"
                                className="secondary-button"
                                onClick={handleAddFeature}
                                disabled={!effectiveSelectedFeature}
                            >
                                Add
                            </button>
                        </div>

                        {features.length > 0 && (
                            <div className="selected-features">
                                {features.map((feature) => (
                                    <button
                                        key={feature}
                                        type="button"
                                        className="feature-chip"
                                        onClick={() => handleRemoveFeature(feature)}
                                    >
                                        {formatEnumLabel(feature)} ×
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {errorMessage && <p className="error-message">{errorMessage}</p>}

                    <button className="primary-button" type="submit" disabled={loading}>
                        {loading ? "Creating..." : "Create spot"}
                    </button>
                </form>
            </section>
        </div>
    );
}
