import { Link, Outlet, useNavigate } from "react-router-dom";

import { tokenStorage } from "../shared/auth/tokenStorage";

export function App() {
    const navigate = useNavigate();

    function handleLogout() {
        tokenStorage.removeAccessToken();
        navigate("/login");
    }

    return (
        <div>
            <header style={{ padding: 16, borderBottom: "1px solid #ddd" }}>
                <nav style={{ display: "flex", gap: 12 }}>
                    <Link to="/profile">Profile</Link>
                    <Link to="/spots">Spots</Link>
                    <Link to="/spots/create">Create spot</Link>
                    <Link to="/admin/spots">Admin spots</Link>

                    <button type="button" onClick={handleLogout}>
                        Logout
                    </button>
                </nav>
            </header>

            <main>
                <Outlet />
            </main>
        </div>
    );
}