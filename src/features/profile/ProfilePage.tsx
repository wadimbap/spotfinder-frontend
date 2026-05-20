import { useEffect, useState } from "react";

import { authApi } from "../auth/authApi";
import type { CurrentUserResponse } from "../auth/authTypes";

export function ProfilePage() {
    const [user, setUser] = useState<CurrentUserResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProfile() {
            try {
                const response = await authApi.getCurrentUser();
                setUser(response);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }

        void loadProfile();
    }, []);

    if (loading) {
        return <p className="page-message">Loading profile...</p>;
    }

    if (!user) {
        return <p className="page-message">User not found</p>;
    }

    return (
        <div className="page">
            <div className="page-card">
                <h1>Profile</h1>

                <div className="info-row">
                    <span>Email</span>
                    <strong>{user.email}</strong>
                </div>

                <div className="info-row">
                    <span>Name</span>
                    <strong>{user.displayName}</strong>
                </div>

                <div className="info-row">
                    <span>Role</span>
                    <strong>{user.role}</strong>
                </div>
            </div>
        </div>
    );
}