import { useEffect, useRef, useState } from "react";
import { spotsApi } from "./spotsApi";
import type { SpotFeature, SpotMetadataResponse, SpotResponse, SpotType } from "./spotsTypes";
import { LocationPicker } from "./LocationPicker";
import { SpotDialog } from "./SpotDialog";
import { getApiError, getApiStatus } from "../../shared/api/apiError";
import { validateSpot } from "./spotValidation";

interface Props {
    spot: SpotResponse;
    onSaved: (spot: SpotResponse) => void;
    onClose: () => void;
    onConflict: () => void;
    saveSpot?: (spotId: string, request: Parameters<typeof spotsApi.updateSpot>[1]) => Promise<SpotResponse>;
}

export function EditSpotPanel({ spot, onSaved, onClose, onConflict, saveSpot = spotsApi.updateSpot }: Props) {
    const [name, setName] = useState(spot.name);
    const [description, setDescription] = useState(spot.description ?? "");
    const [type, setType] = useState<SpotType>(spot.type);
    const [features, setFeatures] = useState<SpotFeature[]>(spot.features);
    const [location, setLocation] = useState<[number, number]>([spot.latitude, spot.longitude]);
    const [metadata, setMetadata] = useState<SpotMetadataResponse | null>(null);
    const [saving, setSaving] = useState(false);
    const [blocked, setBlocked] = useState(false);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    const inFlight = useRef(false);

    useEffect(() => {
        let active = true;
        spotsApi.getMetadata().then((response) => { if (active) setMetadata(response); })
            .catch((error) => { if (active) setError(getApiError(error, "Failed to load spot types and features.")); });
        return () => { active = false; };
    }, [retry]);

    async function save(event: React.FormEvent) {
        event.preventDefault();
        if (inFlight.current || blocked || !metadata) return;
        const request = { name: name.trim(), description: description.trim() || null,
            latitude: location[0], longitude: location[1], type, features };
        const validation = validateSpot(request);
        if (validation) { setError(validation); return; }
        inFlight.current = true;
        setSaving(true); setError("");
        try {
            const updated = await saveSpot(spot.id, request);
            onSaved(updated);
        } catch (error) {
            const status = getApiStatus(error);
            if ([403, 404, 409].includes(status ?? 0)) {
                setBlocked(true);
                onConflict();
            }
            setError(getApiError(error, "Failed to save spot."));
        } finally {
            inFlight.current = false; setSaving(false);
        }
    }

    const close = () => { if (!inFlight.current) onClose(); };
    return <SpotDialog onClose={close} label="Edit spot"><section className="spots-panel">
        <div className="spots-panel-header"><h1>Edit spot</h1>
            <button type="button" aria-label="Close editor" className="panel-close-button" disabled={saving} onClick={close}>×</button></div>
        <form onSubmit={(event) => void save(event)}>
            <fieldset disabled={saving || blocked} className="form-fields">
                <div className="form-field"><label htmlFor="edit-name">Name</label>
                    <input id="edit-name" value={name} minLength={2} maxLength={255} required onChange={(event) => setName(event.target.value)} /></div>
                <div className="form-field"><label htmlFor="edit-description">Description</label>
                    <textarea id="edit-description" value={description} maxLength={2000} onChange={(event) => setDescription(event.target.value)} /></div>
                <div className="form-field"><label htmlFor="edit-type">Type</label>
                    <select id="edit-type" value={type} onChange={(event) => setType(event.target.value as SpotType)}>
                        {(metadata?.types ?? [type]).map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
                    </select></div>
                <fieldset className="feature-options"><legend>Features</legend>
                    {(metadata?.features ?? features).map((value) => <label key={value}>
                        <input type="checkbox" checked={features.includes(value)} onChange={(event) => setFeatures((current) =>
                            event.target.checked ? [...current, value] : current.filter((item) => item !== value))} /> {value.replaceAll("_", " ")}
                    </label>)}
                </fieldset>
                <p className="field-help">Click on the map to move the spot. Location: {location[0]}, {location[1]}</p>
                <LocationPicker location={location} onChange={setLocation} disabled={saving || blocked} />
            </fieldset>
            {!metadata && !error && <p role="status">Loading spot types and features...</p>}
            {error && <p className="error-message" role="alert">{error}</p>}
            {!metadata && error && <button type="button" className="secondary-button" onClick={() => { setError(""); setRetry((value) => value + 1); }}>Retry metadata</button>}
            <div className="action-row"><button className="primary-link-button" disabled={saving || blocked || !metadata}>{saving ? "Saving..." : "Save changes"}</button>
                <button type="button" className="secondary-button" disabled={saving} onClick={close}>Cancel</button></div>
        </form>
    </section></SpotDialog>;
}
