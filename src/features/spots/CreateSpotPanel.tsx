import { useMemo, useState } from "react";

import { spotsApi } from "./spotsApi";
import type {
    SpotFeature,
    SpotMetadataResponse,
    SpotResponse,
    SpotType,
} from "./spotsTypes";

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
    const [type, setType] = useState<SpotType | "">("");
    const [features, setFeatures] = useState<SpotFeature[]>([]);
    const [selectedFeature, setSelectedFeature] = useState<SpotFeature | "">("");
    const [photos, setPhotos] = useState<File[]>([]);

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [photoUploadWarning, setPhotoUploadWarning] = useState("");

    const availableFeatures = useMemo<SpotFeature[]>(() => {
        if (!metadata) {
            return [];
        }

        return metadata.features.filter((feature) => !features.includes(feature));
    }, [metadata, features]);

    const effectiveType: SpotType | "" = type || metadata?.types[0] || "";

    const effectiveSelectedFeature: SpotFeature | "" =
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

    function handleRemoveFeature(feature: SpotFeature) {
        setFeatures((currentFeatures) =>
            currentFeatures.filter((item) => item !== feature),
        );
    }

    function handleTypeChange(value: string) {
        setType(value as SpotType);
    }

    function handleSelectedFeatureChange(value: string) {
        setSelectedFeature(value as SpotFeature);
    }

    function handlePhotosChange(event: React.ChangeEvent<HTMLInputElement>) {
        const selectedFiles = Array.from(event.target.files ?? []);
        setPhotos(selectedFiles.slice(0, 5));
        setPhotoUploadWarning("");
    }

    async function uploadPhotos(spotId: string) {
        if (photos.length === 0) {
            return;
        }

        let hasFailedUploads = false;

        for (const photo of photos) {
            try {
                await spotsApi.uploadSpotPhoto(spotId, photo);
            } catch (error) {
                console.error(error);
                hasFailedUploads = true;
            }
        }

        if (hasFailedUploads) {
            setPhotoUploadWarning("Spot created, but some photos failed to upload");
        }
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
            setPhotoUploadWarning("");

            const createdSpot = await spotsApi.createSpot({
                name: name.trim(),
                description: description.trim() ? description.trim() : null,
                latitude: location[0],
                longitude: location[1],
                type: effectiveType,
                features,
            });

            await uploadPhotos(createdSpot.id);

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
                        onChange={(event) => handleTypeChange(event.target.value)}
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
                            onChange={(event) =>
                                handleSelectedFeatureChange(event.target.value)
                            }
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

                <div className="form-field">
                    <label htmlFor="photos">Photos</label>
                    <input
                        id="photos"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handlePhotosChange}
                    />

                    <p className="field-help">You can upload up to 5 photos.</p>

                    {photos.length > 0 && (
                        <div className="selected-photos-list">
                            {photos.map((photo) => (
                                <span key={`${photo.name}-${photo.size}`}>{photo.name}</span>
                            ))}
                        </div>
                    )}
                </div>

                {errorMessage && <p className="error-message">{errorMessage}</p>}

                {photoUploadWarning && (
                    <p className="error-message">{photoUploadWarning}</p>
                )}

                <button className="primary-button" type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create spot"}
                </button>
            </form>
        </section>
    );
}
