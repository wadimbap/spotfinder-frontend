type ResolvedTheme = "light" | "dark";

export interface MapTileConfig {
    url: string;
    attribution: string;
    usesCarto: boolean;
}

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const CARTO_ATTRIBUTION = `${OSM_ATTRIBUTION}, &copy; <a href="https://carto.com/attribution/">CARTO</a>`;

function readCartoApiKey() {
    return import.meta.env.VITE_CARTO_API_KEY?.trim() ?? "";
}

export function getMapTileConfig(theme: ResolvedTheme, cartoApiKey = readCartoApiKey()): MapTileConfig {
    if (!cartoApiKey) {
        return { url: OSM_URL, attribution: OSM_ATTRIBUTION, usesCarto: false };
    }

    const style = theme === "dark" ? "dark_all" : "light_all";
    return {
        url: `https://basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}.png?key=${encodeURIComponent(cartoApiKey)}`,
        attribution: CARTO_ATTRIBUTION,
        usesCarto: true,
    };
}

export function hasCartoBasemap() {
    return Boolean(readCartoApiKey());
}
