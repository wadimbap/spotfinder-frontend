import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { authApi } from "../auth/authApi";
import { getApiError } from "../../shared/api/apiError";
import { CreateSpotPanel } from "./CreateSpotPanel";
import { SpotDetailsPanel } from "./SpotDetailsPanel";
import { SpotFiltersPanel } from "./SpotFiltersPanel";
import { SpotsMap } from "./SpotsMap";
import { spotsApi } from "./spotsApi";
import { adminSpotsApi } from "../admin/adminSpotsApi";
import { EditSpotPanel } from "./EditSpotPanel";
import type { SpotMetadataResponse, SpotResponse, SpotSearchFilters } from "./spotsTypes";

type PanelMode = "none" | "create" | "details";

interface SpotsPageProps {
    defaultMode?: "list" | "create";
}

export function SpotsPage({ defaultMode = "list" }: SpotsPageProps) {
    const [searchParams] = useSearchParams();
    const [creatingApproved, setCreatingApproved] = useState(searchParams.get("create") === "approved");
    const [canModerate, setCanModerate] = useState(false);
    const [accountLoading, setAccountLoading] = useState(true);
    const [creationBusy, setCreationBusy] = useState(false);
    const [creationPersisted, setCreationPersisted] = useState(false);
    const [reload, setReload] = useState(0);
    const [spots, setSpots] = useState<SpotResponse[]>([]);
    const [metadata, setMetadata] = useState<SpotMetadataResponse | null>(null);
    const [filters, setFilters] = useState<SpotSearchFilters>({ query: "", types: [], features: [] });
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [filtersOpen, setFiltersOpen] = useState(false);

    const [panelMode, setPanelMode] = useState<PanelMode>(
        defaultMode === "create" || ["approved", "pending"].includes(searchParams.get("create") ?? "") ? "create" : "none",
    );

    const [selectedSpot, setSelectedSpot] = useState<SpotResponse | null>(null);
    const [editingSpot, setEditingSpot] = useState<SpotResponse | null>(null);
    const [editingAsModerator, setEditingAsModerator] = useState(false);
    const [draftLocation, setDraftLocation] = useState<[number, number] | null>(
        null,
    );

    const [mapReady, setMapReady] = useState(false);
    const [spotsError, setSpotsError] = useState("");
    const [metadataError, setMetadataError] = useState("");
    const [notice, setNotice] = useState("");

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedQuery(filters.query?.trim() ?? ""), 300);
        return () => window.clearTimeout(timer);
    }, [filters.query]);

    useEffect(() => {
        let active = true;
        authApi.getCurrentUser().then((user) => {
            if (active) setCanModerate(user.role === "ADMIN" || user.role === "MODERATOR");
        }).catch(() => { /* Regular spot creation remains available if the account request fails. */ })
            .finally(() => { if (active) setAccountLoading(false); });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        async function loadSpots() {
            try {
                setSpotsError("");
                const response = await spotsApi.getApprovedSpots({
                    query: debouncedQuery,
                    types: filters.types,
                    features: filters.features,
                });
                if (active) setSpots(response);
            } catch (error) {
                if (active) setSpotsError(getApiError(error, "Failed to load spots."));
            }
            finally { if (active) setMapReady(true); }
        }

        void loadSpots();
        return () => { active = false; };
    }, [reload, debouncedQuery, filters.types, filters.features]);

    useEffect(() => {
        let active = true;
        async function loadMetadata() {
            try {
                setMetadataError("");
                const response = await spotsApi.getMetadata();
                if (active) setMetadata(response);
            } catch (error) {
                if (active) setMetadataError(getApiError(error, "Failed to load spot types and features."));
            }
        }

        void loadMetadata();
        return () => { active = false; };
    }, [reload]);

    function handleOpenCreatePanel(approved = false) {
        setNotice("");
        setCreatingApproved(approved);
        setCreationPersisted(false);
        setSelectedSpot(null);
        setDraftLocation(null);
        setFiltersOpen(false);
        setPanelMode("create");
    }

    function handleClosePanel() {
        if (creationBusy) return;
        setCreationPersisted(false);
        setPanelMode("none");
        setSelectedSpot(null);
        setDraftLocation(null);
    }


    function handleMapClick(latitude: number, longitude: number) {
        setDraftLocation([latitude, longitude]);
    }

    function handleSpotClick(spot: SpotResponse) {
        if (panelMode === "create") return;
        setNotice("");
        setFiltersOpen(false);
        setSelectedSpot(spot);
        setPanelMode("details");
        setDraftLocation(null);
    }

    function handleSpotCreated(createdSpot: SpotResponse) {
        setSpots((currentSpots) => [createdSpot, ...currentSpots.filter((spot) => spot.id !== createdSpot.id)]);
        setSelectedSpot(createdSpot);
        setPanelMode("details");
        setDraftLocation(null);
    }

    function handleSpotUpdated(updated: SpotResponse) {
        setSpots((current) => updated.approved
            ? current.map((spot) => spot.id === updated.id ? updated : spot)
            : current.filter((spot) => spot.id !== updated.id));
        setReload((value) => value + 1);
        if (!updated.approved) setNotice("Spot sent for moderation and hidden from the shared map. You can find it in My spots.");
    }

    const errorMessage = [spotsError, metadataError].filter(Boolean).join(" ");
    const activeFilterCount = (filters.query?.trim() ? 1 : 0)
        + (filters.types?.length ?? 0) + (filters.features?.length ?? 0);

    if (!mapReady) {
        return <p className="page-message">Loading spots...</p>;
    }

    return (
        <div className="spots-map-page">
            <SpotsMap
                spots={spots}
                draftLocation={draftLocation}
                creating={panelMode === "create" && !creationBusy && !creationPersisted}
                onMapClick={handleMapClick}
                onSpotClick={handleSpotClick}
            />

            <div className="spots-top-actions">
                <button
                    type="button"
                    className="primary-link-button"
                    disabled={panelMode === "create"}
                    onClick={() => handleOpenCreatePanel()}
                >
                    Add spot
                </button>
                {canModerate && <button type="button" className="secondary-button" disabled={panelMode === "create"} onClick={() => handleOpenCreatePanel(true)}>Create approved spot</button>}
                <button type="button" className="secondary-button" disabled={panelMode === "create"} onClick={() => {
                    setSelectedSpot(null); setPanelMode("none"); setFiltersOpen(true);
                }}>Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}</button>
            </div>

            {errorMessage && <div className="spots-map-error" role="alert">{errorMessage}
                <button className="secondary-button" disabled={panelMode === "create"} onClick={() => setReload((value) => value + 1)}>Retry map data</button></div>}
            {notice && !errorMessage && <p className="spots-map-notice" role="status">{notice}</p>}

            {panelMode === "create" && creatingApproved && !canModerate && <p className="spots-map-error" role="alert">
                {accountLoading ? "Checking permissions..." : "Creating an approved spot requires MODERATOR or ADMIN permissions."}
                <button className="secondary-button" onClick={handleClosePanel}>Back to map</button></p>}
            {panelMode === "create" && (!creatingApproved || canModerate) && (
                <CreateSpotPanel
                    key={creatingApproved ? "approved" : "pending"}
                    createApproved={creatingApproved}
                    onBusyChange={setCreationBusy}
                    onPersisted={(spot) => { setCreationPersisted(true); setDraftLocation([spot.latitude, spot.longitude]); }}
                    metadata={metadata}
                    location={draftLocation}
                    onCreated={handleSpotCreated}
                    onCancel={handleClosePanel}
                />
            )}

            {filtersOpen && <SpotFiltersPanel filters={filters} metadata={metadata} onChange={setFilters}
                onClose={() => setFiltersOpen(false)} />}

            {panelMode === "details" && selectedSpot && (
                <SpotDetailsPanel key={selectedSpot.id} spot={selectedSpot} onClose={handleClosePanel} onSpotUpdated={handleSpotUpdated} onDeleted={(id) => {
                    setSpots((current) => current.filter((spot) => spot.id !== id));
                    setSelectedSpot((current) => current?.id === id ? null : current);
                }} onEdit={(spot, editor) => {
                    setSelectedSpot(null);
                    setPanelMode("none");
                    setEditingSpot(spot);
                    setEditingAsModerator(editor.role === "MODERATOR" || editor.role === "ADMIN");
                }} />
            )}
            {editingSpot && <EditSpotPanel key={editingSpot.id} spot={editingSpot}
                requiresModeration={!editingAsModerator}
                saveSpot={editingAsModerator ? adminSpotsApi.updateSpot : spotsApi.updateSpot}
                onClose={() => setEditingSpot(null)} onConflict={() => setReload((value) => value + 1)} onSaved={(updated) => {
                    handleSpotUpdated(updated);
                    setEditingSpot(null);
                }} />}
        </div>
    );
}
