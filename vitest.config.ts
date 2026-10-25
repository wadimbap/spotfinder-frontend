import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        setupFiles: ["./tests/setup.ts"],
        env: { VITE_API_BASE_URL: "http://localhost:8080" },
        clearMocks: true,
    },
});
