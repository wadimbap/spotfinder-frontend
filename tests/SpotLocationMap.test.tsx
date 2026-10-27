import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import { ThemeContext } from "../src/shared/theme/theme";
import { SpotLocationMap } from "../src/features/spots/SpotLocationMap";

vi.mock("react-leaflet", () => ({
    MapContainer: ({ children, attributionControl }: { children: ReactNode; attributionControl: boolean }) => <div data-testid="map" data-attribution-control={String(attributionControl)}>{children}</div>,
    Marker: () => <div data-testid="marker" />,
}));
vi.mock("../src/shared/map/MapTileLayer", () => ({ MapTileLayer: () => <div data-testid="tiles" /> }));
vi.mock("../src/shared/map/spotMarkerIcon", () => ({ getSpotMarkerIcon: vi.fn(() => ({})) }));

it("hides Leaflet branding on the spot preview and keeps OSM attribution", () => {
    render(<ThemeContext.Provider value={{ theme: "light", resolvedTheme: "light", setTheme: vi.fn() }}>
        <SpotLocationMap latitude={59.93} longitude={30.36} spotName="Central Plaza" />
    </ThemeContext.Provider>);

    expect(screen.getByTestId("map").dataset.attributionControl).toBe("false");
    expect(screen.getByText("© OSM")).toBeTruthy();
    expect(screen.queryByText(/Leaflet/)).toBeNull();
});
