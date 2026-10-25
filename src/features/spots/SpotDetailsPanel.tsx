import { useEffect, useState } from "react";
import { authApi } from "../auth/authApi";
import type { CurrentUserResponse } from "../auth/authTypes";
import { spotsApi } from "./spotsApi";
import type { SpotResponse } from "./spotsTypes";
import { SpotPhotos } from "./SpotPhotos";
import { getApiError } from "../../shared/api/apiError";

interface SpotDetailsPanelProps {
    spot: SpotResponse;
    onClose: () => void;
}

function formatLabel(value: string) {
    return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function SpotDetailsPanel({ spot: initialSpot, onClose }: SpotDetailsPanelProps) {
    const [spot, setSpot] = useState(initialSpot);
    const [loading, setLoading] = useState(initialSpot.approved);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(null);
    const [accountError, setAccountError] = useState("");

    useEffect(() => {
        let active = true;
        authApi.getCurrentUser().then((response) => { if (active) { setCurrentUser(response); setAccountError(""); } })
            .catch((error) => { if (active) setAccountError(getApiError(error, "Failed to load your account. Photo actions are unavailable.")); });
        return () => { active = false; };
    }, [retry]);

    useEffect(() => {
        if (!initialSpot.approved) return;
        let active = true;
        async function load() {
            setLoading(true); setError("");
            try {
                const response = await spotsApi.getApprovedSpot(initialSpot.id);
                if (active) setSpot(response);
            } catch (error) {
                if (active) setError(getApiError(error, "Failed to load spot. It may no longer be available."));
            } finally {
                if (active) setLoading(false);
            }
        }
        void load();
        return () => { active = false; };
    }, [initialSpot.id, initialSpot.approved, retry]);

    return <section className="spots-panel">
        <div className="spots-panel-header"><div><h1>{loading || error ? "Spot details" : spot.name}</h1>
            {!loading && !error && <span className="spot-type-badge">{formatLabel(spot.type)}</span>}</div>
            <button type="button" aria-label="Close spot details" className="panel-close-button" onClick={onClose}>×</button></div>
        {loading ? <p role="status">Loading spot...</p> : error ? <div role="alert"><p className="error-message">{error}</p>
            <button className="secondary-button" onClick={() => setRetry((value) => value + 1)}>Retry spot</button></div> : <>
            {spot.description && <p className="spot-description">{spot.description}</p>}
            <div className="spot-status-row"><span>Status</span><strong>{spot.approved ? "Approved" : "Pending moderation"}</strong></div>
            <div className="spot-status-row"><span>Location</span><strong>{spot.latitude}, {spot.longitude}</strong></div>
            {!!spot.features.length && <div className="spot-details-section"><h2>Features</h2><div className="selected-features">
                {spot.features.map((feature) => <span key={feature} className="feature-chip-static">{formatLabel(feature)}</span>)}</div></div>}
            {accountError && <div role="alert"><p className="error-message">{accountError}</p>
                <button className="secondary-button" onClick={() => setRetry((value) => value + 1)}>Retry account</button></div>}
            <SpotPhotos key={spot.id} spot={spot} currentUser={currentUser} />
        </>}
    </section>;
}
