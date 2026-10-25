import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { authApi } from "../auth/authApi";
import { getApiError } from "../../shared/api/apiError";
import { CreateSpotPanel } from "./CreateSpotPanel";
import { SpotDetailsPanel } from "./SpotDetailsPanel";
import { SpotsMap } from "./SpotsMap";
import { spotsApi } from "./spotsApi";
import type { SpotMetadataResponse, SpotResponse } from "./spotsTypes";

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

    const [panelMode, setPanelMode] = useState<PanelMode>(
        defaultMode === "create" || ["approved", "pending"].includes(searchParams.get("create") ?? "") ? "create" : "none",
    );

    const [selectedSpot, setSelectedSpot] = useState<SpotResponse | null>(null);
    const [draftLocation, setDraftLocation] = useState<[number, number] | null>(
        null,
    );

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

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
        async function loadPageData() {
            setLoading(true);
            try {
                setErrorMessage("");

                const [spotsResponse, metadataResponse] = await Promise.allSettled([
                    spotsApi.getApprovedSpots(),
                    spotsApi.getMetadata(),
                ]);

                if (!active) return;
                const errors: string[] = [];
                if (spotsResponse.status === "fulfilled") setSpots(spotsResponse.value);
                else errors.push(getApiError(spotsResponse.reason, "Failed to load spots."));
                if (metadataResponse.status === "fulfilled") setMetadata(metadataResponse.value);
                else errors.push(getApiError(metadataResponse.reason, "Failed to load spot types and features."));
                setErrorMessage(errors.join(" "));
            } catch (error) {
                if (active) setErrorMessage(getApiError(error, "Failed to load spots."));
            } finally {
                if (active) setLoading(false);
            }
        }

        void loadPageData();
        return () => { active = false; };
    }, [reload]);

    function handleOpenCreatePanel(approved = false) {
        setCreatingApproved(approved);
        setCreationPersisted(false);
        setSelectedSpot(null);
        setDraftLocation(null);
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

    if (loading) {
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
            </div>

            {errorMessage && <div className="spots-map-error" role="alert">{errorMessage}
                <button className="secondary-button" disabled={panelMode === "create"} onClick={() => setReload((value) => value + 1)}>Retry map data</button></div>}

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

            {panelMode === "details" && selectedSpot && (
                <SpotDetailsPanel key={selectedSpot.id} spot={selectedSpot} onClose={handleClosePanel} onDeleted={(id) => {
                    setSpots((current) => current.filter((spot) => spot.id !== id));
                    setSelectedSpot((current) => current?.id === id ? null : current);
                }} />
            )}
        </div>
    );
}
