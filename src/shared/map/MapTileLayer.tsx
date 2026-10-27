import { TileLayer, type TileLayerProps } from "react-leaflet";

import { useTheme } from "../theme/theme";
import { getMapTileConfig } from "./mapTiles";

export function MapTileLayer(props: Omit<TileLayerProps, "url" | "attribution">) {
    const { resolvedTheme } = useTheme();
    const config = getMapTileConfig(resolvedTheme);

    return <TileLayer key={config.url} url={config.url} attribution={config.attribution} {...props} />;
}
