import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { CurrentUserResponse } from "../auth/authTypes";
import type { SpotPhotoResponse, SpotResponse } from "./spotsTypes";
import { spotsApi } from "./spotsApi";
import { getApiError } from "../../shared/api/apiError";
import { validatePhoto } from "./photoValidation";
import { sortSpotPhotos } from "./photoOrder";
import { notifyPhotoUpdate } from "./photoUpdates";
import { PhotoPlaceholder } from "./PhotoPlaceholder";
import { PhotoViewer } from "./PhotoViewer";

interface Preview { photo: SpotPhotoResponse; url: string }
interface Props { spot: SpotResponse; currentUser: CurrentUserResponse | null; showCover?: boolean; children?: ReactNode; onUploaded?: () => void }

export function SpotPhotos({ spot, currentUser, showCover = false, children, onUploaded }: Props) {
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
    const closeViewer = useCallback(() => setSelectedId(null), []);
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
            else setUploadNotice(`${uploaded} photo${uploaded === 1 ? "" : "s"} uploaded.${currentUser?.role === "USER" ? " The spot is pending moderation." : ""}`);
            if (uploaded) {
                setReload((value) => value + 1);
                onUploaded?.();
            }
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

    const selected = previews.find((item) => item.photo.id === selectedId);
    const deleting = previews.find((item) => item.photo.id === deleteTarget);
    const cover = previews.find((item) => item.photo.id === photoIds[0]);
    return <>
        {showCover && <div className="spot-detail-cover">
            {cover && failedCoverId !== cover.photo.id
                ? <button className="spot-detail-cover-button" aria-label={`View cover photo of ${spot.name}`} onClick={() => setSelectedId(cover.photo.id)}>
                    <img src={cover.url} alt="" onError={() => setFailedCoverId(cover.photo.id)} /></button>
                : <PhotoPlaceholder loading={loading} unavailable={!loading && (!!photoIds.length || !!error)} />}
        </div>}
        {children}
        <div className="spot-details-section spot-gallery" role="group" aria-label="Photos">
        {loading && <p role="status">Loading photos...</p>}
        {error && <div role="alert"><p className="error-message">{error}</p><button className="secondary-button" disabled={busy} onClick={() => setReload((value) => value + 1)}>Retry photos</button></div>}
        {deleteError && <p className="error-message" role="alert">{deleteError}</p>}
        {!loading && !error && !previews.length && <p className="field-help">No photos yet.</p>}
        {canUpload && <input ref={input} id={`photos-${spot.id}`} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={busy}
            aria-label="Add photos (JPEG, PNG, WebP; up to 5 MiB each)" onChange={(event) => {
                const selected = Array.from(event.target.files ?? []);
                setUploadNotice("");
                if (selected.length > 5) { setUploadError("Choose up to 5 files at a time."); setFiles([]); if (input.current) input.current.value = ""; return; }
                setFiles(selected); setUploadError(selected.map(validatePhoto).filter(Boolean).join(" "));
            }} />}
        <div className="spot-photos-grid">{previews.map(({ photo, url }) => <div key={photo.id} className="spot-photo-item">
            <button className="spot-photo-button" aria-label={`View ${photo.originalFilename}`} onClick={() => setSelectedId(photo.id)}>
                <img src={url} alt={photo.originalFilename} className="spot-photo" /></button>
            {canDelete(photo) && <button type="button" className="photo-delete-button" aria-label={`Delete photo ${photo.originalFilename}`} title="Delete photo"
                disabled={busy || loading} onClick={() => { setDeleteTarget(photo.id); setDeleteError(""); }}>×</button>}
        </div>)}
            {canUpload && <button type="button" className="photo-add-tile" disabled={busy || loading} onClick={() => input.current?.click()}
                title="JPEG, PNG or WebP; up to 5 files, 5 MiB each"><span aria-hidden="true">＋</span><span>Add photos</span></button>}
        </div>
        {deleting && <div className="photo-delete-confirm" role="group" aria-label="Confirm photo deletion">
            <p>Delete this photo permanently? <strong>{deleting.photo.originalFilename}</strong></p>
            <div className="action-row"><button className="reject-button" disabled={busy || loading} onClick={() => void remove(deleting.photo)}>Confirm delete photo</button>
                <button type="button" className="secondary-button" disabled={busy} onClick={() => { setDeleteTarget(null); setDeleteError(""); }}>Cancel</button></div>
        </div>}
        {canUpload && files.length > 0 && <div className="spot-photo-upload">
            {spot.approved && currentUser?.role === "USER" && <p className="field-help" role="note">
                Uploading photos will send this entire spot back for moderation and hide it from the shared map until approved again.
            </p>}
            <ul className="field-help">{files.map((file, index) => <li key={`${file.name}-${index}`}>{file.name}</li>)}</ul>
            <p className="field-help">JPEG, PNG, WebP · up to 5 files · 5 MiB each</p>
            <div className="action-row"><button className="primary-button" disabled={busy || loading || files.some((file) => !!validatePhoto(file))} onClick={() => void upload()}>{busy ? "Processing..." : "Upload photos"}</button>
                <button type="button" className="secondary-button" disabled={busy} onClick={() => { setFiles([]); setUploadError(""); setUploadNotice(""); if (input.current) input.current.value = ""; }}>Cancel</button></div>
        </div>}
        {uploadError && <p className="error-message" role="alert">{uploadError}</p>}
        {uploadNotice && <p className="success-message" role="status">{uploadNotice}</p>}
        {selected && <PhotoViewer photos={previews.map(({ photo, url }) => ({ id: photo.id, url, alt: photo.originalFilename }))}
            selectedId={selected.photo.id} onSelect={setSelectedId} onClose={closeViewer} />}
    </div></>;
}
