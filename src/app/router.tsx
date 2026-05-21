import { createBrowserRouter, Navigate } from "react-router-dom";

import { App } from "./App";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterPage } from "../features/auth/RegisterPage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { SpotsPage } from "../features/spots/SpotsPage";
import { RequireAuth } from "../shared/auth/RequireAuth";
import { AdminSpotsPage } from "../features/admin/AdminSpotsPage";

export const router = createBrowserRouter([
    {
        path: "/login",
        element: <LoginPage />,
    },
    {
        path: "/register",
        element: <RegisterPage />,
    },
    {
        path: "/",
        element: (
            <RequireAuth>
                <App />
            </RequireAuth>
        ),
        children: [
            {
                index: true,
                element: <Navigate to="/spots" replace />,
            },
            {
                path: "profile",
                element: <ProfilePage />,
            },
            {
                path: "spots",
                element: <SpotsPage />,
            },
            {
                path: "spots/create",
                element: <Navigate to="/spots" replace />,
            },
            {
                path: "admin/spots",
                element: <AdminSpotsPage />,
            },
        ],
    },
]);
