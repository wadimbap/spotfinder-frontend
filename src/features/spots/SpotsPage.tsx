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
    const [spots, setSpots] = useState<SpotResponse[]>([]);
    const [metadata, setMetadata] = useState<SpotMetadataResponse | null>(null);

    const [panelMode, setPanelMode] = useState<PanelMode>(
        defaultMode === "create" || searchParams.get("create") === "approved" ? "create" : "none",
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
        async function loadPageData() {
            try {
                setErrorMessage("");

                const [spotsResponse, metadataResponse] = await Promise.all([
                    spotsApi.getApprovedSpots(),
                    spotsApi.getMetadata(),
                ]);

                setSpots(spotsResponse);
                setMetadata(metadataResponse);
            } catch (error) {
                console.error(error);
                setErrorMessage(getApiError(error, "Failed to load spots."));
            } finally {
                setLoading(false);
            }
        }

        void loadPageData();
    }, []);

    function handleOpenCreatePanel(approved = false) {
        setCreatingApproved(approved);
        setSelectedSpot(null);
        setDraftLocation(null);
        setPanelMode("create");
    }

    function handleClosePanel() {
        setPanelMode("none");
        setSelectedSpot(null);
        setDraftLocation(null);
    }


    function handleMapClick(latitude: number, longitude: number) {
        setDraftLocation([latitude, longitude]);
    }

    function handleSpotClick(spot: SpotResponse) {
        setSelectedSpot(spot);
        setPanelMode("details");
        setDraftLocation(null);
    }

    function handleSpotCreated(createdSpot: SpotResponse) {
        setSpots((currentSpots) => [createdSpot, ...currentSpots]);
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
                creating={panelMode === "create"}
                onMapClick={handleMapClick}
                onSpotClick={handleSpotClick}
            />

            <div className="spots-top-actions">
                <button
                    type="button"
                    className="primary-link-button"
                    onClick={() => handleOpenCreatePanel()}
                >
                    Add spot
                </button>
                {canModerate && <button type="button" className="secondary-button" onClick={() => handleOpenCreatePanel(true)}>Create approved spot</button>}
            </div>

            {errorMessage && <p className="spots-map-error">{errorMessage}</p>}

            {panelMode === "create" && creatingApproved && !canModerate && <p className="spots-map-error" role="alert">
                {accountLoading ? "Checking permissions..." : "Creating an approved spot requires MODERATOR or ADMIN permissions."}</p>}
            {panelMode === "create" && (!creatingApproved || canModerate) && (
                <CreateSpotPanel
                    key={creatingApproved ? "approved" : "pending"}
                    createApproved={creatingApproved}
                    metadata={metadata}
                    location={draftLocation}
                    onCreated={handleSpotCreated}
                    onCancel={handleClosePanel}
                />
            )}

            {panelMode === "details" && selectedSpot && (
                <SpotDetailsPanel key={selectedSpot.id} spot={selectedSpot} onClose={handleClosePanel} />
            )}
        </div>
    );
}
