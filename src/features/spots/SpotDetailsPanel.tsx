import { useEffect, useRef, useState } from "react";
import { authApi } from "../auth/authApi";
import type { CurrentUserResponse } from "../auth/authTypes";
import { spotsApi } from "./spotsApi";
import type { SpotResponse } from "./spotsTypes";
import { SpotPhotos } from "./SpotPhotos";
import { getApiError } from "../../shared/api/apiError";
import { adminSpotsApi } from "../admin/adminSpotsApi";
import { ModerationActions } from "../admin/ModerationActions";
import { DeleteSpotAction } from "../admin/DeleteSpotAction";
import { SpotComments } from "../comments/SpotComments";
import { SpotLocationMap } from "./SpotLocationMap";

interface SpotDetailsPanelProps {
    spot: SpotResponse;
    onClose: () => void;
    source?: "public" | "own" | "admin";
    onModerated?: (spotId: string) => void;
    onDeleted?: (spotId: string) => void;
    onEdit?: (spot: SpotResponse, user: CurrentUserResponse) => void;
    onSpotUpdated?: (spot: SpotResponse) => void;
}

function formatLabel(value: string) {
    return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function SpotDetailsPanel({ spot: initialSpot, onClose, source = "public", onModerated, onDeleted, onEdit, onSpotUpdated }: SpotDetailsPanelProps) {
    const [spot, setSpot] = useState(initialSpot);
    const [loading, setLoading] = useState(initialSpot.approved || source !== "public");
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(null);
    const [accountError, setAccountError] = useState("");
    const uploadedOwnPhotos = useRef(false);
    const canEdit = Boolean(onEdit && currentUser && (
        currentUser.role === "MODERATOR"
        || currentUser.role === "ADMIN"
        || currentUser.id === spot.createdByUserId
    ));

    useEffect(() => {
        let active = true;
        authApi.getCurrentUser().then((response) => { if (active) { setCurrentUser(response); setAccountError(""); } })
            .catch((error) => { if (active) setAccountError(getApiError(error, "Failed to load your account. Photo actions are unavailable.")); });
        return () => { active = false; };
    }, [retry]);

    useEffect(() => {
        if (!initialSpot.approved && source === "public") return;
        let active = true;
        async function load() {
            setLoading(true); setError("");
            try {
                let response: SpotResponse;
                if (source === "admin") response = await adminSpotsApi.getSpot(initialSpot.id);
                else if (source === "own" || uploadedOwnPhotos.current) {
                    const ownSpots = await spotsApi.getMySpots();
                    const ownSpot = ownSpots.find((item) => item.id === initialSpot.id);
                    if (!ownSpot) throw new Error("Spot not found");
                    response = ownSpot;
                } else response = await spotsApi.getApprovedSpot(initialSpot.id);
                if (active) setSpot(response);
            } catch (error) {
                if (active) setError(getApiError(error, "Failed to load spot. It may no longer be available."));
            } finally {
                if (active) setLoading(false);
            }
        }
        void load();
        return () => { active = false; };
    }, [initialSpot.id, initialSpot.approved, source, retry]);

    return <section className="spots-panel spot-details-panel">
        <button type="button" aria-label="Close spot details" className="panel-close-button detail-close-button" onClick={onClose}>×</button>
        {(loading || error) && <div className="spots-panel-header"><h1>Spot details</h1></div>}
        {loading ? <p role="status">Loading spot...</p> : error ? <div role="alert"><p className="error-message">{error}</p>
            <button className="secondary-button" onClick={() => setRetry((value) => value + 1)}>Retry spot</button></div> : <>
            <SpotPhotos key={spot.id} spot={spot} currentUser={currentUser} showCover onUploaded={() => {
                uploadedOwnPhotos.current = true;
                if (currentUser?.role === "USER") {
                    const updated = { ...spot, approved: false };
                    setSpot(updated);
                    onSpotUpdated?.(updated);
                }
            }}>
            <div className="spots-panel-header"><div><h1>{spot.name}</h1>
                <div className="spot-detail-badges"><span className="spot-type-badge">{formatLabel(spot.type)}</span>
                    <strong className={spot.approved ? "approved-badge" : "pending-badge"}>{spot.approved ? "Approved" : "Pending"}</strong></div>
            </div></div>
            {spot.description && <p className="spot-description">{spot.description}</p>}
            <p className="spot-location"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
                <span>{spot.latitude}, {spot.longitude}</span></p>
            {(source === "admin" || source === "own") && <SpotLocationMap latitude={spot.latitude} longitude={spot.longitude} spotName={spot.name} />}
            {(spot.features.length > 0 || canEdit) && <div className="selected-features spot-detail-features" role="group" aria-label="Features">
                {spot.features.map((feature) => <span key={feature} className="feature-chip-static">{formatLabel(feature)}</span>)}
                {canEdit && currentUser && <button type="button" className="feature-chip-static spot-edit-chip" onClick={() => onEdit?.(spot, currentUser)}>Edit spot</button>}
            </div>}
            {accountError && <div role="alert"><p className="error-message">{accountError}</p>
                <button className="secondary-button" onClick={() => setRetry((value) => value + 1)}>Retry account</button></div>}
            </SpotPhotos>
            <SpotComments key={`comments-${spot.id}`} spotId={spot.id} currentUser={currentUser} />
            {source === "admin" && !spot.approved && (currentUser?.role === "MODERATOR" || currentUser?.role === "ADMIN")
                && <ModerationActions spotId={spot.id} onDone={onModerated ?? (() => onClose())} />}
            <DeleteSpotAction spotId={spot.id} currentUser={currentUser} onDeleted={onDeleted ?? (() => onClose())} />
        </>}
    </section>;
}
