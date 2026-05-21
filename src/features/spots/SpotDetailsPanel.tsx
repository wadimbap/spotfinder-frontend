import { useEffect, useState } from "react";

import { authApi } from "../auth/authApi";
import { spotsApi } from "./spotsApi";
import type { SpotPhotoResponse, SpotResponse } from "./spotsTypes";

interface SpotDetailsPanelProps {
    spot: SpotResponse;
    onClose: () => void;
}

interface PhotoPreview {
    photo: SpotPhotoResponse;
    url: string;
}

function formatEnumLabel(value: string): string {
    return value
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export function SpotDetailsPanel({ spot, onClose }: SpotDetailsPanelProps) {
    const [photoPreviews, setPhotoPreviews] = useState<PhotoPreview[]>([]);
    const [photosLoading, setPhotosLoading] = useState(true);
    const [photosError, setPhotosError] = useState("");

    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const canUploadPhotos = currentUserId === spot.createdByUserId;

    useEffect(() => {
        async function loadCurrentUser() {
            try {
                const user = await authApi.getCurrentUser();
                setCurrentUserId(user.id);
            } catch (error) {
                console.error(error);
            }
        }

        void loadCurrentUser();
    }, []);

    useEffect(() => {
        let active = true;
        const objectUrls: string[] = [];

        async function loadPhotos() {
            try {
                setPhotosLoading(true);
                setPhotosError("");

                const photos = await spotsApi.getSpotPhotos(spot.id);

                const previews = await Promise.all(
                    photos.map(async (photo) => {
                        const blob = await spotsApi.getSpotPhotoContent(spot.id, photo.id);
                        const url = URL.createObjectURL(blob);

                        objectUrls.push(url);

                        return {
                            photo,
                            url,
                        };
                    }),
                );

                if (active) {
                    setPhotoPreviews(previews);
                }
            } catch (error) {
                console.error(error);

                if (active) {
                    setPhotosError("Failed to load photos");
                }
            } finally {
                if (active) {
                    setPhotosLoading(false);
                }
            }
        }

        void loadPhotos();

        return () => {
            active = false;
            objectUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [spot.id]);

    async function reloadPhotos() {
        const oldUrls = photoPreviews.map((preview) => preview.url);

        try {
            setPhotosLoading(true);
            setPhotosError("");

            const photos = await spotsApi.getSpotPhotos(spot.id);

            const previews = await Promise.all(
                photos.map(async (photo) => {
                    const blob = await spotsApi.getSpotPhotoContent(spot.id, photo.id);
                    const url = URL.createObjectURL(blob);

                    return {
                        photo,
                        url,
                    };
                }),
            );

            oldUrls.forEach((url) => URL.revokeObjectURL(url));
            setPhotoPreviews(previews);
        } catch (error) {
            console.error(error);
            setPhotosError("Failed to load photos");
        } finally {
            setPhotosLoading(false);
        }
    }

    function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(event.target.files ?? []);
        setSelectedFiles(files.slice(0, 5));
        setUploadError("");
    }

    async function handleUploadPhotos() {
        if (selectedFiles.length === 0) {
            return;
        }

        try {
            setUploading(true);
            setUploadError("");

            for (const file of selectedFiles) {
                await spotsApi.uploadSpotPhoto(spot.id, file);
            }

            setSelectedFiles([]);
            await reloadPhotos();
        } catch (error) {
            console.error(error);
            setUploadError("Failed to upload photos");
        } finally {
            setUploading(false);
        }
    }

    function handlePreviousPhoto() {
        if (selectedPhotoIndex === null || photoPreviews.length === 0) {
            return;
        }

        setSelectedPhotoIndex(
            selectedPhotoIndex === 0 ? photoPreviews.length - 1 : selectedPhotoIndex - 1,
        );
    }

    function handleNextPhoto() {
        if (selectedPhotoIndex === null || photoPreviews.length === 0) {
            return;
        }

        setSelectedPhotoIndex(
            selectedPhotoIndex === photoPreviews.length - 1 ? 0 : selectedPhotoIndex + 1,
        );
    }

    const selectedPhoto =
        selectedPhotoIndex === null ? null : photoPreviews[selectedPhotoIndex];

    return (
        <>
            <section className="spots-panel">
                <div className="spots-panel-header">
                    <div>
                        <h1>{spot.name}</h1>
                        <span className="spot-type-badge">{formatEnumLabel(spot.type)}</span>
                    </div>

                    <button type="button" className="panel-close-button" onClick={onClose}>
                        ×
                    </button>
                </div>

                {spot.description && (
                    <p className="spot-description">{spot.description}</p>
                )}

                <div className="spot-status-row">
                    <span>Status</span>
                    <strong>{spot.approved ? "Approved" : "Pending moderation"}</strong>
                </div>

                <div className="spot-status-row">
                    <span>Location</span>
                    <strong>
                        {spot.latitude}, {spot.longitude}
                    </strong>
                </div>

                {spot.features.length > 0 && (
                    <div className="spot-details-section">
                        <h2>Features</h2>

                        <div className="selected-features">
                            {spot.features.map((feature) => (
                                <span key={feature} className="feature-chip-static">
                                    {formatEnumLabel(feature)}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="spot-details-section">
                    <h2>Photos</h2>

                    {canUploadPhotos && (
                        <div className="spot-photo-upload">
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                onChange={handleFilesChange}
                            />

                            {selectedFiles.length > 0 && (
                                <div className="selected-photos-list">
                                    {selectedFiles.map((file) => (
                                        <span key={`${file.name}-${file.size}`}>
                                            {file.name}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <button
                                type="button"
                                className="secondary-button"
                                disabled={uploading || selectedFiles.length === 0}
                                onClick={() => void handleUploadPhotos()}
                            >
                                {uploading ? "Uploading..." : "Upload photos"}
                            </button>

                            {uploadError && <p className="error-message">{uploadError}</p>}
                        </div>
                    )}

                    {photosLoading && <p className="field-help">Loading photos...</p>}

                    {photosError && <p className="error-message">{photosError}</p>}

                    {!photosLoading && !photosError && photoPreviews.length === 0 && (
                        <div className="photos-placeholder">No photos yet.</div>
                    )}

                    {photoPreviews.length > 0 && (
                        <div className="spot-photos-grid">
                            {photoPreviews.map(({ photo, url }, index) => (
                                <button
                                    key={photo.id}
                                    type="button"
                                    className="spot-photo-button"
                                    onClick={() => setSelectedPhotoIndex(index)}
                                >
                                    <img
                                        src={url}
                                        alt={photo.originalFilename}
                                        className="spot-photo"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {selectedPhoto && (
                <div className="photo-viewer-overlay" role="dialog" aria-modal="true">
                    <button
                        type="button"
                        className="photo-viewer-close"
                        onClick={() => setSelectedPhotoIndex(null)}
                    >
                        ×
                    </button>

                    {photoPreviews.length > 1 && (
                        <button
                            type="button"
                            className="photo-viewer-nav photo-viewer-nav-left"
                            onClick={handlePreviousPhoto}
                        >
                            ‹
                        </button>
                    )}

                    <img
                        src={selectedPhoto.url}
                        alt={selectedPhoto.photo.originalFilename}
                        className="photo-viewer-image"
                    />

                    {photoPreviews.length > 1 && (
                        <button
                            type="button"
                            className="photo-viewer-nav photo-viewer-nav-right"
                            onClick={handleNextPhoto}
                        >
                            ›
                        </button>
                    )}

                    <div className="photo-viewer-counter">
                        {selectedPhotoIndex! + 1} / {photoPreviews.length}
                    </div>
                </div>
            )}
        </>
    );
}
