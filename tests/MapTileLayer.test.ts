import { expect, it } from "vitest";

import { getMapTileConfig } from "../src/shared/map/mapTiles";

it("uses the existing OpenStreetMap layer when no CARTO key is configured", () => {
    expect(getMapTileConfig("light", "")).toMatchObject({
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        usesCarto: false,
    });
});

it("uses Positron for the light theme when CARTO is configured", () => {
    expect(getMapTileConfig("light", "test-key")).toMatchObject({
        url: "https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png?key=test-key",
        usesCarto: true,
    });
});

it("uses Dark Matter for the dark theme when CARTO is configured", () => {
    expect(getMapTileConfig("dark", "test-key")).toMatchObject({
        url: "https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=test-key",
        usesCarto: true,
    });
});
