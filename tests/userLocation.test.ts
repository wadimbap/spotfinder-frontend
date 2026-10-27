import { describe, expect, it } from "vitest";

import { toMapCoordinates } from "../src/shared/map/userLocation";

describe("toMapCoordinates", () => {
    it("rounds browser coordinates to the precision used by spot locations", () => {
        const position = {
            coords: {
                latitude: 59.931123789,
                longitude: 30.360987654,
            },
        } as GeolocationPosition;

        expect(toMapCoordinates(position)).toEqual([59.931124, 30.360988]);
    });
});
