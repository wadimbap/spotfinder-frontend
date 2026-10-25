import { useRef, useState } from "react";
import { spotsApi } from "./spotsApi";
import { adminSpotsApi } from "../admin/adminSpotsApi";
import type { SpotFeature, SpotMetadataResponse, SpotResponse, SpotType } from "./spotsTypes";
import { getApiError } from "../../shared/api/apiError";
import { validateSpot } from "./spotValidation";
import { validatePhoto } from "./photoValidation";

interface CreateSpotPanelProps {
    metadata: SpotMetadataResponse | null;
    location: [number, number] | null;
    onCreated: (spot: SpotResponse) => void;
    onCancel: () => void;
    createApproved?: boolean;
}

export function CreateSpotPanel({ metadata, location, onCreated, onCancel, createApproved = false }: CreateSpotPanelProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState<SpotType | "">("");
    const [features, setFeatures] = useState<SpotFeature[]>([]);
    const [photos, setPhotos] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [created, setCreated] = useState<SpotResponse | null>(null);
    const inFlight = useRef(false);
    const effectiveType = type || metadata?.types[0];

    async function finishPhotos(saved: SpotResponse) {
        const failed: File[] = [];
        let message = "";
        for (const photo of photos) {
            try { await spotsApi.uploadSpotPhoto(saved.id, photo); }
            catch (error) { failed.push(photo); message = getApiError(error, "Failed to upload photos."); }
        }
        setPhotos(failed);
        if (failed.length) setError(`Spot created. ${failed.length} photo(s) failed to upload. ${message} Retry failed photos or continue to the spot.`);
        else onCreated(saved);
    }

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        if (inFlight.current) return;
        if (!metadata || !location || !effectiveType) { setError("Choose a location on the map and wait for spot metadata to load."); return; }
        const request = { name: name.trim(), description: description.trim() || null,
            latitude: location[0], longitude: location[1], type: effectiveType, features };
        const validation = validateSpot(request) || photos.map(validatePhoto).filter(Boolean).join(" ");
        if (validation) { setError(validation); return; }
        inFlight.current = true; setLoading(true); setError("");
        try {
            const saved = created ?? await (createApproved ? adminSpotsApi.createApprovedSpot(request) : spotsApi.createSpot(request));
            setCreated(saved);
            await finishPhotos(saved);
        } catch (error) {
            setError(getApiError(error, "Failed to create spot."));
        } finally {
            inFlight.current = false; setLoading(false);
        }
    }

    return <section className="spots-panel">
        <div className="spots-panel-header"><h1>{createApproved ? "Create approved spot" : "Add spot"}</h1>
            <button type="button" aria-label="Close creation form" className="panel-close-button" disabled={loading}
                onClick={() => created ? onCreated(created) : onCancel()}>×</button></div>
        <form onSubmit={(event) => void submit(event)}>
            <fieldset className="form-fields" disabled={loading || !!created}>
                <div className="form-field"><label htmlFor="name">Name</label>
                    <input id="name" value={name} minLength={2} maxLength={255} required onChange={(event) => setName(event.target.value)} /></div>
                <div className="form-field"><label htmlFor="description">Description</label>
                    <textarea id="description" value={description} maxLength={2000} onChange={(event) => setDescription(event.target.value)} /></div>
                <div className="form-field"><label htmlFor="type">Type</label>
                    <select id="type" value={effectiveType ?? ""} required onChange={(event) => setType(event.target.value as SpotType)}>
                        {metadata?.types.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
                    </select></div>
                <fieldset className="feature-options"><legend>Features (choose at least one)</legend>
                    {metadata?.features.map((value) => <label key={value}><input type="checkbox" checked={features.includes(value)}
                        onChange={(event) => setFeatures((current) => event.target.checked ? [...current, value] : current.filter((item) => item !== value))} /> {value.replaceAll("_", " ")}</label>)}
                </fieldset>
                <p className="field-help">Click on the map to choose spot location.</p>
                <p className="field-help">Lat: {location?.[0] ?? "—"}, Lng: {location?.[1] ?? "—"}</p>
                <div className="form-field"><label htmlFor="photos">Photos (up to 5 files at a time, 5 MiB each)</label>
                    <input id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => {
                        const files = Array.from(event.target.files ?? []);
                        if (files.length > 5) { setError("Choose up to 5 photos."); setPhotos([]); return; }
                        setPhotos(files); setError(files.map(validatePhoto).filter(Boolean).join(" "));
                    }} /></div>
            </fieldset>
            {!!photos.length && <ul className="field-help">{photos.map((photo, index) => <li key={`${photo.name}-${index}`}>{photo.name}</li>)}</ul>}
            {error && <p className="error-message" role="alert">{error}</p>}
            <button className="primary-button" disabled={loading || !metadata}>{loading ? "Saving..." : created ? "Retry failed photos" : createApproved ? "Create approved spot" : "Create spot"}</button>
            {created && <button type="button" className="secondary-button" disabled={loading} onClick={() => onCreated(created)}>Continue to spot</button>}
        </form>
    </section>;
}
