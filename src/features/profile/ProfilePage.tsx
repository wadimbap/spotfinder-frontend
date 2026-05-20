import { useEffect, useState } from "react";

import { authApi } from "../auth/authApi";
import type { ActivityType, CurrentUserResponse } from "../auth/authTypes";

const ACTIVITY_TYPES: ActivityType[] = [
    "SKATEBOARDING",
    "SCOOTER",
    "BMX",
    "ROLLERBLADING",
];

function formatEnumLabel(value: string): string {
    return value
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export function ProfilePage() {
    const [user, setUser] = useState<CurrentUserResponse | null>(null);
    const [editingPrimaryActivity, setEditingPrimaryActivity] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        async function loadProfile() {
            try {
                const response = await authApi.getCurrentUser();
                setUser(response);
            } catch (error) {
                console.error(error);
                setErrorMessage("Failed to load profile");
            } finally {
                setLoading(false);
            }
        }

        void loadProfile();
    }, []);

    async function handlePrimaryActivityChange(value: string) {
        const primaryActivity = value ? (value as ActivityType) : null;

        try {
            setSaving(true);
            setErrorMessage("");

            const response = await authApi.updateCurrentUser({
                primaryActivity,
            });

            setUser(response);
            setEditingPrimaryActivity(false);
        } catch (error) {
            console.error(error);
            setErrorMessage("Failed to update primary activity");
        } finally {
            setSaving(false);
        }
    }

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

                {errorMessage && <p className="error-message">{errorMessage}</p>}

                <div className="info-row">
                    <span>Email</span>
                    <strong>{user.email}</strong>
                </div>

                <div className="info-row">
                    <span>Name</span>
                    <strong>{user.displayName}</strong>
                </div>

                <div className="info-row">
                    <span>Primary activity</span>

                    {editingPrimaryActivity ? (
                        <select
                            className="inline-select"
                            value={user.primaryActivity ?? ""}
                            disabled={saving}
                            autoFocus
                            onBlur={() => setEditingPrimaryActivity(false)}
                            onChange={(event) =>
                                void handlePrimaryActivityChange(event.target.value)
                            }
                        >
                            <option value="">Not selected</option>

                            {ACTIVITY_TYPES.map((activityType) => (
                                <option key={activityType} value={activityType}>
                                    {formatEnumLabel(activityType)}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <button
                            type="button"
                            className="inline-value-button"
                            onClick={() => setEditingPrimaryActivity(true)}
                        >
                            {user.primaryActivity
                                ? formatEnumLabel(user.primaryActivity)
                                : "Not selected"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
