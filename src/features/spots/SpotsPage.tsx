import { useEffect, useState } from "react";
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
    const [spots, setSpots] = useState<SpotResponse[]>([]);
    const [metadata, setMetadata] = useState<SpotMetadataResponse | null>(null);

    const [panelMode, setPanelMode] = useState<PanelMode>(
        defaultMode === "create" ? "create" : "none",
    );

    const [selectedSpot, setSelectedSpot] = useState<SpotResponse | null>(null);
    const [draftLocation, setDraftLocation] = useState<[number, number] | null>(
        null,
    );

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

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
                setErrorMessage("Failed to load spots");
            } finally {
                setLoading(false);
            }
        }

        void loadPageData();
    }, []);

    function handleOpenCreatePanel() {
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
                    onClick={handleOpenCreatePanel}
                >
                    Add spot
                </button>
            </div>

            {errorMessage && <p className="spots-map-error">{errorMessage}</p>}

            {panelMode === "create" && (
                <CreateSpotPanel
                    metadata={metadata}
                    location={draftLocation}
                    onCreated={handleSpotCreated}
                    onCancel={handleClosePanel}
                />
            )}

            {panelMode === "details" && selectedSpot && (
                <SpotDetailsPanel spot={selectedSpot} onClose={handleClosePanel} />
            )}
        </div>
    );
}
