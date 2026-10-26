import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { authApi } from "../features/auth/authApi";
import type { CurrentUserResponse } from "../features/auth/authTypes";
import { tokenStorage } from "../shared/auth/tokenStorage";
import { getApiError, getApiStatus } from "../shared/api/apiError";
import "./layout.css";
import { ThemeControl } from "../shared/theme/ThemeControl";

export function App() {
    const navigate = useNavigate();
    const [sessionError, setSessionError] = useState("");
    const [retry, setRetry] = useState(0);

    const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(
        null,
    );

    const canSeeAdminSpots =
        currentUser?.role === "ADMIN" || currentUser?.role === "MODERATOR";

    useEffect(() => {
        let active = true;
        async function loadCurrentUser() {
            try {
                const response = await authApi.getCurrentUser();
                if (active) { setCurrentUser(response); setSessionError(""); }
            } catch (error) {
                if (!active) return;
                if (getApiStatus(error) === 401) {
                    tokenStorage.removeAccessToken();
                    navigate("/login");
                } else {
                    setSessionError(getApiError(error, "Failed to load your account."));
                }
            }
        }

        void loadCurrentUser();
        return () => { active = false; };
    }, [navigate, retry]);

    function handleLogout() {
        tokenStorage.removeAccessToken();
        navigate("/login");
    }

    return (
        <div className="app-layout">
            <header className="app-header">
                <NavLink className="app-logo" to="/spots">
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
                    SpotFinder
                </NavLink>

                <nav className="app-nav">
                    <NavLink to="/profile">Profile</NavLink>
                    <NavLink to="/spots">Spots</NavLink>
                    <NavLink to="/my-spots">My spots</NavLink>

                    {canSeeAdminSpots && (
                        <NavLink to="/admin/spots">Admin spots</NavLink>
                    )}
                </nav>

                <div className="app-header-actions">
                    <ThemeControl />
                    {currentUser && (
                        <span className="app-user-role">{currentUser.role}</span>
                    )}

                    <button type="button" className="logout-button" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </header>

            <main className="app-content">
                {sessionError && <div className="page" role="alert"><p className="error-message">{sessionError}</p>
                    <button className="secondary-button" onClick={() => setRetry((value) => value + 1)}>Retry account</button></div>}
                <Outlet />
            </main>
        </div>
    );
}
