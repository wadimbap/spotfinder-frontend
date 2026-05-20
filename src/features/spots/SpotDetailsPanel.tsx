import type { SpotResponse } from "./spotsTypes";

interface SpotDetailsPanelProps {
    spot: SpotResponse;
    onClose: () => void;
}

function formatEnumLabel(value: string): string {
    return value
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export function SpotDetailsPanel({ spot, onClose }: SpotDetailsPanelProps) {
    return (
        <section className="spots-panel">
            <div className="spots-panel-header">
                <div>
                    <h1>{spot.name}</h1>
                    <span className="spot-type-badge">{formatEnumLabel(spot.type)}</span>
                </div>

                <button type="button" className="panel-close-button" onClick={onClose}>
                    ×
                </button>
            </div>

            {spot.description && <p className="spot-description">{spot.description}</p>}

            <div className="spot-status-row">
                <span>Status</span>
                <strong>{spot.approved ? "Approved" : "Pending moderation"}</strong>
            </div>

            <div className="spot-status-row">
                <span>Location</span>
                <strong>
                    {spot.latitude}, {spot.longitude}
                </strong>
            </div>

            {spot.features.length > 0 && (
                <div className="spot-details-section">
                    <h2>Features</h2>

                    <div className="selected-features">
                        {spot.features.map((feature) => (
                            <span key={feature} className="feature-chip-static">
                {formatEnumLabel(feature)}
              </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="spot-details-section">
                <h2>Photos</h2>
                <div className="photos-placeholder">
                    Photos will be added later.
                </div>
            </div>
        </section>
    );
}
