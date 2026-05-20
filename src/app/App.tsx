import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { authApi } from "../features/auth/authApi";
import type { CurrentUserResponse } from "../features/auth/authTypes";
import { tokenStorage } from "../shared/auth/tokenStorage";

export function App() {
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(
        null,
    );

    const canSeeAdminSpots =
        currentUser?.role === "ADMIN" || currentUser?.role === "MODERATOR";

    useEffect(() => {
        async function loadCurrentUser() {
            try {
                const response = await authApi.getCurrentUser();
                setCurrentUser(response);
            } catch (error) {
                console.error(error);
                tokenStorage.removeAccessToken();
                navigate("/login");
            }
        }

        void loadCurrentUser();
    }, [navigate]);

    function handleLogout() {
        tokenStorage.removeAccessToken();
        navigate("/login");
    }

    return (
        <div className="app-layout">
            <header className="app-header">
                <NavLink className="app-logo" to="/spots">
                    SpotFinder
                </NavLink>

                <nav className="app-nav">
                    <NavLink to="/profile">Profile</NavLink>
                    <NavLink to="/spots">Spots</NavLink>

                    {canSeeAdminSpots && (
                        <NavLink to="/admin/spots">Admin spots</NavLink>
                    )}
                </nav>

                <div className="app-header-actions">
                    {currentUser && (
                        <span className="app-user-role">{currentUser.role}</span>
                    )}

                    <button type="button" className="logout-button" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </header>

            <main className="app-content">
                <Outlet />
            </main>
        </div>
    );
}
