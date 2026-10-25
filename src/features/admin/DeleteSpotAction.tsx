import { useRef, useState } from "react";
import type { CurrentUserResponse } from "../auth/authTypes";
import { adminSpotsApi } from "./adminSpotsApi";
import { getApiError } from "../../shared/api/apiError";

interface Props { spotId: string; currentUser: CurrentUserResponse | null; onDeleted: (id: string) => void }

export function DeleteSpotAction({ spotId, currentUser, onDeleted }: Props) {
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const inFlight = useRef(false);
    if (currentUser?.role !== "ADMIN") return null;

    async function remove() {
        if (inFlight.current || currentUser?.role !== "ADMIN") return;
        inFlight.current = true; setBusy(true); setError("");
        try { await adminSpotsApi.deleteSpot(spotId); onDeleted(spotId); }
        catch (error) { setError(getApiError(error, "Failed to delete spot.")); }
        finally { inFlight.current = false; setBusy(false); }
    }

    return <div className="spot-details-section">
        <h2>Administration</h2>
        {error && <p className="error-message" role="alert">{error}</p>}
        {confirming ? <><p>Permanently delete this spot, its photos and comments?</p><div className="action-row">
            <button className="reject-button" disabled={busy} onClick={() => void remove()}>{busy ? "Deleting..." : "Confirm delete spot"}</button>
            <button className="secondary-button" disabled={busy} onClick={() => { setConfirming(false); setError(""); }}>Cancel</button>
        </div></> : <button className="reject-button" onClick={() => setConfirming(true)}>Delete spot</button>}
    </div>;
}
