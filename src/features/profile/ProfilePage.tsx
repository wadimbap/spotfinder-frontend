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
    const [selectedActivityType, setSelectedActivityType] = useState<
        ActivityType | ""
    >("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        async function loadProfile() {
            try {
                const response = await authApi.getCurrentUser();

                setUser(response);
                setSelectedActivityType(response.activityType ?? "");
            } catch (error) {
                console.error(error);
                setErrorMessage("Failed to load profile");
            } finally {
                setLoading(false);
            }
        }

        void loadProfile();
    }, []);

    async function handleSaveActivityType() {
        if (!selectedActivityType) {
            return;
        }

        try {
            setSaving(true);
            setErrorMessage("");

            const response = await authApi.updateCurrentUser({
                activityType: selectedActivityType,
            });

            setUser(response);
            setSelectedActivityType(response.activityType ?? "");
        } catch (error) {
            console.error(error);
            setErrorMessage("Failed to update activity type");
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

                <div className="profile-field">
                    <div>
                        <label htmlFor="activityType">Activity</label>
                        <p>
                            {user.activityType
                                ? formatEnumLabel(user.activityType)
                                : "Not selected yet"}
                        </p>
                    </div>

                    <div className="profile-select-row">
                        <select
                            id="activityType"
                            value={selectedActivityType}
                            onChange={(event) =>
                                setSelectedActivityType(event.target.value as ActivityType | "")
                            }
                        >
                            <option value="">Select activity</option>

                            {ACTIVITY_TYPES.map((activityType) => (
                                <option key={activityType} value={activityType}>
                                    {formatEnumLabel(activityType)}
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={handleSaveActivityType}
                            disabled={!selectedActivityType || saving}
                        >
                            {saving ? "Saving..." : "Save"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
