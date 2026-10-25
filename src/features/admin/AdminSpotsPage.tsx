import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminSpotsApi } from "./adminSpotsApi";
import { authApi } from "../auth/authApi";
import type { SpotResponse } from "../spots/spotsTypes";
import { SpotDetailsPanel } from "../spots/SpotDetailsPanel";
import { SpotDialog } from "../spots/SpotDialog";
import { getApiError } from "../../shared/api/apiError";
import { ModerationActions } from "./ModerationActions";

export function AdminSpotsPage() {
    const [spots, setSpots] = useState<SpotResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);
    const [error, setError] = useState("");
    const [reload, setReload] = useState(0);
    const [selected, setSelected] = useState<SpotResponse | null>(null);

    useEffect(() => {
        let active = true;
        async function load() {
            setLoading(true); setError("");
            try {
                const user = await authApi.getCurrentUser();
                if (!active) return;
                const canModerate = user.role === "MODERATOR" || user.role === "ADMIN";
                setAllowed(canModerate);
                if (!canModerate) { setError("This page requires MODERATOR or ADMIN permissions."); return; }
                const response = await adminSpotsApi.getPendingSpots();
                if (active) setSpots(response);
            } catch (error) {
                if (active) setError(getApiError(error, "Failed to load pending spots."));
            } finally { if (active) setLoading(false); }
        }
        void load();
        return () => { active = false; };
    }, [reload]);

    function completed(id: string) {
        setSpots((current) => current.filter((spot) => spot.id !== id));
        setSelected((current) => current?.id === id ? null : current);
    }

    return <div className="page">
        <div className="page-header"><div><h1>Spot moderation</h1><p>Review pending spots and their photos.</p></div>
            {allowed && <Link className="primary-link-button" to="/spots?create=approved">Create approved spot</Link>}
        </div>
        {loading && <p role="status">Loading pending spots...</p>}
        {error && <div role="alert"><p className="error-message">{error}</p></div>}
        {!loading && <button className="secondary-button" onClick={() => setReload((value) => value + 1)}>Reload queue</button>}
        {!loading && !error && allowed && (spots.length ? <div className="admin-spots-grid">
            {spots.map((spot) => <article className="admin-spot-card" key={spot.id}>
                <div className="admin-spot-card-header"><h2>{spot.name}</h2><strong className="pending-badge">Pending</strong></div>
                <p className="admin-spot-description">{spot.description}</p>
                <p className="field-help">{spot.latitude}, {spot.longitude}</p>
                <div className="spot-features">{spot.features.map((feature) => <span key={feature}>{feature.replaceAll("_", " ")}</span>)}</div>
                <div className="action-row"><button className="secondary-button" onClick={() => setSelected(spot)}>Review details</button></div>
                <ModerationActions spotId={spot.id} onDone={completed} />
            </article>)}
        </div> : <p className="page-card">No pending spots.</p>)}
        {selected && <SpotDialog onClose={() => setSelected(null)}>
            <SpotDetailsPanel key={selected.id} source="admin" spot={selected} onClose={() => setSelected(null)} onModerated={completed} onDeleted={completed} />
        </SpotDialog>}
    </div>;
}
