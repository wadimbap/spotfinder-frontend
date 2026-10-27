import type { SpotFeature, SpotMetadataResponse, SpotSearchFilters } from "./spotsTypes";

interface SpotFiltersPanelProps {
    filters: SpotSearchFilters;
    metadata: SpotMetadataResponse | null;
    onChange: (filters: SpotSearchFilters) => void;
    onClose: () => void;
}

const conditionFeatures: SpotFeature[] = ["LIGHTING", "COVERED"];

function formatLabel(value: string) {
    return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function toggle<T extends string>(values: T[] | undefined, value: T) {
    const current = values ?? [];
    return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

function hasActiveSpotFilters(filters: SpotSearchFilters) {
    return Boolean(filters.query?.trim()) || Boolean(filters.types?.length) || Boolean(filters.features?.length);
}

export function SpotFiltersPanel({ filters, metadata, onChange, onClose }: SpotFiltersPanelProps) {
    const types = metadata?.types ?? [];
    const features = metadata?.features ?? [];
    const elements = features.filter((feature) => !conditionFeatures.includes(feature));
    const conditions = features.filter((feature) => conditionFeatures.includes(feature));
    const selectedTypes = filters.types ?? [];
    const selectedFeatures = filters.features ?? [];

    return <section className="spots-panel spot-filters-panel" aria-label="Spot filters">
        <div className="spots-panel-header"><h1>Find spots</h1>
            <button type="button" aria-label="Close filters" className="panel-close-button" onClick={onClose}>×</button></div>
        <div className="form-field"><label htmlFor="spot-filter-query">Name</label>
            <input id="spot-filter-query" type="search" value={filters.query ?? ""} placeholder="Search by name"
                onChange={(event) => onChange({ ...filters, query: event.target.value })} /></div>
        {!metadata && <p role="status" className="field-help">Loading filter options...</p>}
        <fieldset className="spot-filter-group" disabled={!metadata}><legend>Type</legend>
            <div className="spot-filter-options">{types.map((type) => <label key={type}>
                <input type="checkbox" checked={selectedTypes.includes(type)} onChange={() => onChange({
                    ...filters, types: toggle(selectedTypes, type),
                })} /> {formatLabel(type)}
            </label>)}</div>
        </fieldset>
        <fieldset className="spot-filter-group" disabled={!metadata}><legend>Elements</legend>
            <p className="field-help">Every selected element must be present.</p>
            <div className="spot-filter-options">{elements.map((feature) => <label key={feature}>
                <input type="checkbox" checked={selectedFeatures.includes(feature)} onChange={() => onChange({
                    ...filters, features: toggle(selectedFeatures, feature),
                })} /> {formatLabel(feature)}
            </label>)}</div>
        </fieldset>
        <fieldset className="spot-filter-group" disabled={!metadata}><legend>Conditions</legend>
            <div className="spot-filter-options">{conditions.map((feature) => <label key={feature}>
                <input type="checkbox" checked={selectedFeatures.includes(feature)} onChange={() => onChange({
                    ...filters, features: toggle(selectedFeatures, feature),
                })} /> {formatLabel(feature)}
            </label>)}</div>
        </fieldset>
        <button type="button" className="secondary-button" disabled={!hasActiveSpotFilters(filters)}
            onClick={() => onChange({ query: "", types: [], features: [] })}>Clear filters</button>
    </section>;
}
