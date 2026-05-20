import { useMemo, useState } from "react";

import { spotsApi } from "./spotsApi";
import type { SpotMetadataResponse, SpotResponse } from "./spotsTypes";

interface CreateSpotPanelProps {
    metadata: SpotMetadataResponse | null;
    location: [number, number] | null;
    onCreated: (spot: SpotResponse) => void;
    onCancel: () => void;
}

function formatEnumLabel(value: string): string {
    return value
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export function CreateSpotPanel({
                                    metadata,
                                    location,
                                    onCreated,
                                    onCancel,
                                }: CreateSpotPanelProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState("");
    const [features, setFeatures] = useState<string[]>([]);
    const [selectedFeature, setSelectedFeature] = useState("");

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const availableFeatures = useMemo(() => {
        if (!metadata) {
            return [];
        }

        return metadata.features.filter((feature) => !features.includes(feature));
    }, [metadata, features]);

    const effectiveType = type || metadata?.types[0] || "";

    const effectiveSelectedFeature =
        selectedFeature && availableFeatures.includes(selectedFeature)
            ? selectedFeature
            : availableFeatures[0] ?? "";

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

        if (!metadata) {
            setErrorMessage("Spot metadata is not loaded");
            return;
        }

        if (!location) {
            setErrorMessage("Click on the map to choose spot location");
            return;
        }

        if (!effectiveType) {
            setErrorMessage("Select spot type");
            return;
        }

        try {
            setLoading(true);
            setErrorMessage("");

            const createdSpot = await spotsApi.createSpot({
                name: name.trim(),
                description: description.trim() ? description.trim() : null,
                latitude: location[0],
                longitude: location[1],
                type: effectiveType,
                features,
            });

            onCreated(createdSpot);
        } catch (error) {
            console.error(error);
            setErrorMessage("Failed to create spot");
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="spots-panel">
            <div className="spots-panel-header">
                <h1>Add spot</h1>

                <button type="button" className="panel-close-button" onClick={onCancel}>
                    ×
                </button>
            </div>

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
                        value={effectiveType}
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
                            <span>Lat: {location?.[0] ?? "—"}</span>
                            <span>Lng: {location?.[1] ?? "—"}</span>
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
    );
}
