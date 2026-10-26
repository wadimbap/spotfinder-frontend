import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CurrentUserResponse } from "../auth/authTypes";
import type { SpotPhotoResponse, SpotResponse } from "./spotsTypes";
import { spotsApi } from "./spotsApi";
import { getApiError } from "../../shared/api/apiError";
import { validatePhoto } from "./photoValidation";
import { sortSpotPhotos } from "./photoOrder";
import { notifyPhotoUpdate } from "./photoUpdates";
import { PhotoPlaceholder } from "./PhotoPlaceholder";

interface Preview { photo: SpotPhotoResponse; url: string }
interface Props { spot: SpotResponse; currentUser: CurrentUserResponse | null; showCover?: boolean; children?: ReactNode }

export function SpotPhotos({ spot, currentUser, showCover = false, children }: Props) {
    const [previews, setPreviews] = useState<Preview[]>([]);
    const [photoIds, setPhotoIds] = useState<string[]>([]);
    const [failedCoverId, setFailedCoverId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reload, setReload] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [uploadError, setUploadError] = useState("");
    const [uploadNotice, setUploadNotice] = useState("");
    const [busy, setBusy] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState("");
    const inFlight = useRef(false);
    const mounted = useRef(false);
    const input = useRef<HTMLInputElement>(null);
    const urls = useRef(new Set<string>());
    const canUpload = currentUser?.id === spot.createdByUserId;
    const canDelete = (photo: SpotPhotoResponse) => !!currentUser && (currentUser.id === photo.createdByUserId
        || currentUser.role === "ADMIN" || currentUser.role === "MODERATOR");

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    useEffect(() => {
        let active = true;
        const ownedUrls = new Set<string>();
        async function load() {
            setLoading(true); setError(""); setPreviews([]); setPhotoIds([]); setFailedCoverId(null); setSelectedId(null);
            try {
                const photos = sortSpotPhotos(await spotsApi.getSpotPhotos(spot.id));
                if (!active) return;
                setPhotoIds(photos.map((photo) => photo.id));
                const results = await Promise.allSettled(photos.map(async (photo): Promise<Preview | null> => {
                    const blob = await spotsApi.getSpotPhotoContent(spot.id, photo.id);
                    if (!active) return null;
                    const url = URL.createObjectURL(blob);
                    ownedUrls.add(url); urls.current.add(url);
                    return { photo, url };
                }));
                if (!active) return;
                setPreviews(results.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : []));
                const failed = results.find((result) => result.status === "rejected");
                if (failed?.status === "rejected") setError(getApiError(failed.reason, "Some photos could not be loaded."));
            } catch (error) {
                if (active) setError(getApiError(error, "Failed to load photos."));
            } finally {
                if (active) setLoading(false);
            }
        }
        void load();
        const liveUrls = urls.current;
        return () => {
            active = false;
            ownedUrls.forEach((url) => { if (liveUrls.delete(url)) URL.revokeObjectURL(url); });
        };
    }, [spot.id, reload]);

    async function upload() {
        if (!canUpload || !files.length || inFlight.current) return;
        const validation = files.map(validatePhoto).filter(Boolean).join(" ");
        if (validation) { setUploadError(validation); return; }
        inFlight.current = true; setBusy(true); setUploadError(""); setUploadNotice("");
        const failed: File[] = [];
        let message = "";
        let uploaded = 0;
        for (const file of files) {
            try { await spotsApi.uploadSpotPhoto(spot.id, file); uploaded++; }
            catch (error) { failed.push(file); message = getApiError(error, "Failed to upload photos."); }
        }
        if (uploaded) notifyPhotoUpdate(spot.id);
        if (mounted.current) {
            setFiles(failed);
            if (input.current) input.current.value = "";
            if (failed.length) setUploadError(`${uploaded} uploaded, ${failed.length} failed. ${message} Failed files are kept for retry.`);
            else setUploadNotice(`${uploaded} photo${uploaded === 1 ? "" : "s"} uploaded.`);
            if (uploaded) setReload((value) => value + 1);
            setBusy(false);
        }
        inFlight.current = false;
    }

    async function remove(photo: SpotPhotoResponse) {
        if (!canDelete(photo) || inFlight.current) return;
        inFlight.current = true; setBusy(true); setDeleteError("");
        try {
            await spotsApi.deleteSpotPhoto(spot.id, photo.id);
            notifyPhotoUpdate(spot.id);
            if (mounted.current) {
                const preview = previews.find((item) => item.photo.id === photo.id);
                if (preview && urls.current.delete(preview.url)) URL.revokeObjectURL(preview.url);
                setPreviews((current) => current.filter((item) => item.photo.id !== photo.id));
                setPhotoIds((current) => current.filter((id) => id !== photo.id));
                if (selectedId === photo.id) setSelectedId(null);
                setDeleteTarget(null);
            }
        } catch (error) {
            if (mounted.current) setDeleteError(getApiError(error, "Failed to delete photo."));
        } finally {
            inFlight.current = false;
            if (mounted.current) setBusy(false);
        }
    }

    const selectedIndex = previews.findIndex((item) => item.photo.id === selectedId);
    const selected = previews[selectedIndex];
    const cover = previews.find((item) => item.photo.id === photoIds[0]);
    return <>
        {showCover && <div className="spot-detail-cover">
            {cover && failedCoverId !== cover.photo.id
                ? <button className="spot-detail-cover-button" aria-label={`View cover photo of ${spot.name}`} onClick={() => setSelectedId(cover.photo.id)}>
                    <img src={cover.url} alt="" onError={() => setFailedCoverId(cover.photo.id)} /></button>
                : <PhotoPlaceholder loading={loading} unavailable={!loading && (!!photoIds.length || !!error)} />}
        </div>}
        {children}
        <div className="spot-details-section">
        <h2>Photos</h2>
        {loading && <p role="status">Loading photos...</p>}
        {error && <div role="alert"><p className="error-message">{error}</p><button className="secondary-button" disabled={busy} onClick={() => setReload((value) => value + 1)}>Retry photos</button></div>}
        {deleteError && <p className="error-message" role="alert">{deleteError}</p>}
        {!loading && !error && !previews.length && <div className="photos-placeholder">No photos yet.</div>}
        <div className="spot-photos-grid">{previews.map(({ photo, url }) => <div key={photo.id}>
            <button className="spot-photo-button" aria-label={`View ${photo.originalFilename}`} onClick={() => setSelectedId(photo.id)}>
                <img src={url} alt={photo.originalFilename} className="spot-photo" /></button>
            {canDelete(photo) && (deleteTarget === photo.id ? <div className="photo-delete-confirm">
                <p>Delete this photo permanently?</p>
                <button className="reject-button" disabled={busy || loading} onClick={() => void remove(photo)}>Confirm delete photo</button>
                <button className="secondary-button" disabled={busy} onClick={() => { setDeleteTarget(null); setDeleteError(""); }}>Cancel</button>
            </div> : <button className="secondary-button" disabled={busy || loading} onClick={() => { setDeleteTarget(photo.id); setDeleteError(""); }}>Delete photo</button>)}
        </div>)}</div>
        {canUpload && <div className="spot-photo-upload">
            <label htmlFor={`photos-${spot.id}`}>Add photos (JPEG, PNG, WebP; up to 5 MiB each)</label>
            <input ref={input} id={`photos-${spot.id}`} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy}
                onChange={(event) => {
                    const selected = Array.from(event.target.files ?? []);
                    setUploadNotice("");
                    if (selected.length > 5) { setUploadError("Choose up to 5 files at a time."); setFiles([]); return; }
                    setFiles(selected); setUploadError(selected.map(validatePhoto).filter(Boolean).join(" "));
                }} />
            <ul className="field-help">{files.map((file, index) => <li key={`${file.name}-${index}`}>{file.name}</li>)}</ul>
            <button className="secondary-button" disabled={busy || loading || !files.length} onClick={() => void upload()}>{busy ? "Processing..." : "Upload photos"}</button>
            {uploadError && <p className="error-message" role="alert">{uploadError}</p>}
            {uploadNotice && <p className="success-message" role="status">{uploadNotice}</p>}
        </div>}
        {selected && <div className="photo-viewer-overlay" role="dialog" aria-modal="true" aria-label="Photo viewer"
            onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setSelectedId(null); } }}>
            <button autoFocus className="photo-viewer-close" aria-label="Close photo" onClick={() => setSelectedId(null)}>×</button>
            {previews.length > 1 && <button className="photo-viewer-nav photo-viewer-nav-left" aria-label="Previous photo"
                onClick={() => setSelectedId(previews[(selectedIndex + previews.length - 1) % previews.length].photo.id)}>‹</button>}
            <img src={selected.url} alt={selected.photo.originalFilename} className="photo-viewer-image" />
            {previews.length > 1 && <button className="photo-viewer-nav photo-viewer-nav-right" aria-label="Next photo"
                onClick={() => setSelectedId(previews[(selectedIndex + 1) % previews.length].photo.id)}>›</button>}
            <div className="photo-viewer-counter">{selectedIndex + 1} / {previews.length}</div>
        </div>}
    </div></>;
}
