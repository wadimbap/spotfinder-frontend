import { useRef, useState } from "react";
import { adminSpotsApi } from "./adminSpotsApi";
import { getApiError, getApiStatus } from "../../shared/api/apiError";

interface Props { spotId: string; onDone: (spotId: string) => void }

export function ModerationActions({ spotId, onDone }: Props) {
    const [busy, setBusy] = useState(false);
    const [confirmReject, setConfirmReject] = useState(false);
    const [error, setError] = useState("");
    const inFlight = useRef(false);

    async function act(action: "approve" | "reject") {
        if (inFlight.current) return;
        inFlight.current = true; setBusy(true); setError("");
        try {
            if (action === "approve") await adminSpotsApi.approveSpot(spotId);
            else await adminSpotsApi.rejectSpot(spotId);
            onDone(spotId);
        } catch (error) {
            setError(getApiStatus(error) === 409
                ? "This spot is already approved. Reload the queue to see its current status."
                : getApiError(error, `Failed to ${action} spot.`));
        } finally { inFlight.current = false; setBusy(false); }
    }

    return <div className="moderation-actions">
        {error && <p role="alert" className="error-message">{error}</p>}
        {confirmReject ? <><p>Reject and permanently delete this pending spot?</p><div className="action-row">
            <button className="reject-button" disabled={busy} onClick={() => void act("reject")}>Confirm rejection</button>
            <button className="secondary-button" disabled={busy} onClick={() => setConfirmReject(false)}>Cancel</button></div></>
            : <div className="admin-spot-actions"><button className="approve-button" disabled={busy} onClick={() => void act("approve")}>{busy ? "Processing..." : "Approve"}</button>
                <button className="reject-button" disabled={busy} onClick={() => setConfirmReject(true)}>Reject</button></div>}
    </div>;
}
