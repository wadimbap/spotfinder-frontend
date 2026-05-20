import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { spotsApi } from "./spotsApi";
import { SpotsMap } from "./SpotsMap";
import type { SpotResponse } from "./spotsTypes";

export function SpotsPage() {
    const [spots, setSpots] = useState<SpotResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        async function loadSpots() {
            try {
                setErrorMessage("");

                const response = await spotsApi.getApprovedSpots();

                setSpots(response);
            } catch (error) {
                console.error(error);
                setErrorMessage("Failed to load spots");
            } finally {
                setLoading(false);
            }
        }

        void loadSpots();
    }, []);

    if (loading) {
        return <p className="page-message">Loading spots...</p>;
    }

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>Spots</h1>
                    <p>Approved spots</p>
                </div>

                <Link className="primary-link-button" to="/spots/create">
                    Add spot
                </Link>
            </div>

            {errorMessage && <p className="error-message">{errorMessage}</p>}

            <SpotsMap spots={spots} />

            {spots.length === 0 && !errorMessage && (
                <div className="page-card">
                    <p>No spots found.</p>
                </div>
            )}

            <div className="spots-grid">
                {spots.map((spot) => (
                    <article className="spot-card" key={spot.id}>
                        <div className="spot-card-header">
                            <h2>{spot.name}</h2>
                            <span>{spot.type}</span>
                        </div>

                        {spot.description && <p>{spot.description}</p>}

                        <div className="spot-meta">
                            <span>Lat: {spot.latitude}</span>
                            <span>Lng: {spot.longitude}</span>
                        </div>

                        {spot.features.length > 0 && (
                            <div className="spot-features">
                                {spot.features.map((feature) => (
                                    <span key={feature}>{feature}</span>
                                ))}
                            </div>
                        )}
                    </article>
                ))}
            </div>
        </div>
    );
}
