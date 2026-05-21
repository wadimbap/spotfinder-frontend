import { useEffect, useState } from "react";

import { adminSpotsApi } from "./adminSpotsApi";
import type { SpotResponse } from "../spots/spotsTypes";

function formatEnumLabel(value: string): string {
    return value
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export function AdminSpotsPage() {
    const [spots, setSpots] = useState<SpotResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionSpotId, setActionSpotId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        async function loadPendingSpots() {
            try {
                setErrorMessage("");

                const response = await adminSpotsApi.getPendingSpots();

                setSpots(response);
            } catch (error) {
                console.error(error);
                setErrorMessage("Failed to load pending spots");
            } finally {
                setLoading(false);
            }
        }

        void loadPendingSpots();
    }, []);

    async function handleApprove(spotId: string) {
        try {
            setActionSpotId(spotId);
            setErrorMessage("");

            await adminSpotsApi.approveSpot(spotId);

            setSpots((currentSpots) =>
                currentSpots.filter((spot) => spot.id !== spotId),
            );
        } catch (error) {
            console.error(error);
            setErrorMessage("Failed to approve spot");
        } finally {
            setActionSpotId(null);
        }
    }

    async function handleReject(spotId: string) {
        try {
            setActionSpotId(spotId);
            setErrorMessage("");

            await adminSpotsApi.rejectSpot(spotId);

            setSpots((currentSpots) =>
                currentSpots.filter((spot) => spot.id !== spotId),
            );
        } catch (error) {
            console.error(error);
            setErrorMessage("Failed to reject spot");
        } finally {
            setActionSpotId(null);
        }
    }

    if (loading) {
        return <p className="page-message">Loading pending spots...</p>;
    }

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>Spot moderation</h1>
                    <p>Review and approve pending spots</p>
                </div>
            </div>

            {errorMessage && <p className="error-message">{errorMessage}</p>}

            {spots.length === 0 ? (
                <div className="page-card">
                    <p>No pending spots.</p>
                </div>
            ) : (
                <div className="admin-spots-grid">
                    {spots.map((spot) => (
                        <article className="admin-spot-card" key={spot.id}>
                            <div className="admin-spot-card-header">
                                <div>
                                    <h2>{spot.name}</h2>
                                    <span>{formatEnumLabel(spot.type)}</span>
                                </div>

                                <strong className="pending-badge">Pending</strong>
                            </div>

                            {spot.description && (
                                <p className="admin-spot-description">{spot.description}</p>
                            )}

                            <div className="admin-spot-meta">
                                <div>
                                    <span>Latitude</span>
                                    <strong>{spot.latitude}</strong>
                                </div>

                                <div>
                                    <span>Longitude</span>
                                    <strong>{spot.longitude}</strong>
                                </div>
                            </div>

                            {spot.features.length > 0 && (
                                <div className="spot-features">
                                    {spot.features.map((feature) => (
                                        <span key={feature}>{formatEnumLabel(feature)}</span>
                                    ))}
                                </div>
                            )}

                            <div className="admin-spot-actions">
                                <button
                                    type="button"
                                    className="approve-button"
                                    disabled={actionSpotId === spot.id}
                                    onClick={() => void handleApprove(spot.id)}
                                >
                                    {actionSpotId === spot.id ? "Processing..." : "Approve"}
                                </button>

                                <button
                                    type="button"
                                    className="reject-button"
                                    disabled={actionSpotId === spot.id}
                                    onClick={() => void handleReject(spot.id)}
                                >
                                    Reject
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
