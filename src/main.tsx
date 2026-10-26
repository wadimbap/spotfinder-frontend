import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "leaflet/dist/leaflet.css";

import { router } from "./app/router";
import "./index.css";
import { ThemeProvider } from "./shared/theme/ThemeProvider";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeProvider><RouterProvider router={router} /></ThemeProvider>
    </StrictMode>,
);
