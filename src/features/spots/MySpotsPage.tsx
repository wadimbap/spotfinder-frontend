import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { spotsApi } from "./spotsApi";
import type { SpotResponse } from "./spotsTypes";
import { SpotDetailsPanel } from "./SpotDetailsPanel";
import { SpotDialog } from "./SpotDialog";
import { getApiError } from "../../shared/api/apiError";
import { EditSpotPanel } from "./EditSpotPanel";
import { SpotCover } from "./SpotCover";

export function MySpotsPage() {
    const [spots, setSpots] = useState<SpotResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reload, setReload] = useState(0);
    const [selected, setSelected] = useState<SpotResponse | null>(null);
    const [editing, setEditing] = useState<SpotResponse | null>(null);

    useEffect(() => {
        let active = true;
        async function load() {
            setLoading(true);
            setError("");
            try {
                const response = await spotsApi.getMySpots();
                if (active) setSpots(response);
            } catch (error) {
                if (active) setError(getApiError(error, "Failed to load your spots."));
            } finally {
                if (active) setLoading(false);
            }
        }
        void load();
        return () => { active = false; };
    }, [reload]);

    return (
        <div className="page">
            <div className="page-header"><div><h1>My spots</h1><p>Your approved spots and submissions awaiting moderation.</p></div>
                <Link className="primary-link-button" to="/spots?create=pending">Add spot</Link></div>
            {loading && <p role="status">Loading your spots...</p>}
            {error && <div role="alert"><p className="error-message">{error}</p>
                <button className="secondary-button" onClick={() => setReload((value) => value + 1)}>Retry</button></div>}
            {!loading && !error && spots.length === 0 && <p className="page-card">You have not added any spots yet.</p>}
            {!loading && !error && <div className="spots-grid">{spots.map((spot) => (
                <article key={spot.id} className="spot-card spot-card-with-cover">
                    <div className="spot-card-media"><SpotCover spotId={spot.id} name={spot.name} />
                        <strong className={spot.approved ? "approved-badge" : "pending-badge"}>{spot.approved ? "Approved" : "Pending"}</strong></div>
                    <div className="spot-card-body">
                    <div className="spot-card-header"><h2>{spot.name}</h2></div>
                    <span className="spot-type-badge">{spot.type === "SKATEPARK" ? "Skatepark" : "Street"}</span>
                    <p className="spot-description">{spot.description}</p>
                    <p className="field-help spot-coordinates">{spot.latitude}, {spot.longitude}</p>
                    <div className="action-row"><button className="secondary-button" onClick={() => setSelected(spot)}>View details</button>
                        {!spot.approved && <button className="secondary-button" onClick={() => setEditing(spot)}>Edit spot</button>}</div>
                    </div>
                </article>
            ))}</div>}
            {selected && <SpotDialog onClose={() => setSelected(null)}>
                <SpotDetailsPanel key={selected.id} source="own" spot={selected} onClose={() => setSelected(null)} onDeleted={(id) => {
                    setSpots((current) => current.filter((item) => item.id !== id));
                    setSelected((current) => current?.id === id ? null : current);
                }} />
            </SpotDialog>}
            {editing && <EditSpotPanel key={editing.id} spot={editing} onClose={() => setEditing(null)}
                onConflict={() => setReload((value) => value + 1)} onSaved={(updated) => {
                    setSpots((current) => current.map((item) => item.id === updated.id ? updated : item));
                    setEditing(null);
                }} />}
        </div>
    );
}
