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
        return <p>Loading profile...</p>;
    }

    if (!user) {
        return <p>User not found</p>;
    }

    return (
        <div style={{ padding: 24 }}>
            <h1>Profile</h1>

            <p>
                <strong>ID:</strong> {user.id}
            </p>

            <p>
                <strong>Email:</strong> {user.email}
            </p>

            <p>
                <strong>Name:</strong> {user.name}
            </p>

            <p>
                <strong>Role:</strong> {user.role}
            </p>
        </div>
    );
}