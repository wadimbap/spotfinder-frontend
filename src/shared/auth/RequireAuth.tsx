import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { tokenStorage } from "./tokenStorage";

interface RequireAuthProps {
    children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
    if (!tokenStorage.hasAccessToken()) {
        return <Navigate to="/login" replace />;
    }

    return children;
}