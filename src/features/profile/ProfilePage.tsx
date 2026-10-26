import { useEffect, useRef, useState } from "react";
import { authApi } from "../auth/authApi";
import type { ActivityType, CurrentUserResponse } from "../auth/authTypes";
import { getApiError } from "../../shared/api/apiError";
import { SelectControl } from "../../shared/components/SelectControl";

const ACTIVITY_TYPES: ActivityType[] = ["SKATEBOARDING", "SCOOTER", "BMX", "ROLLERBLADING"];

export function ProfilePage() {
    const [user, setUser] = useState<CurrentUserResponse | null>(null);
    const [name, setName] = useState("");
    const [activity, setActivity] = useState<ActivityType | "">("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);
    const [retry, setRetry] = useState(0);
    const inFlight = useRef(false);

    useEffect(() => {
        let active = true;
        async function load() {
            setLoading(true); setError("");
            try {
                const response = await authApi.getCurrentUser();
                if (active) { setUser(response); setName(response.displayName); setActivity(response.primaryActivity ?? ""); }
            } catch (error) {
                if (active) setError(getApiError(error, "Failed to load profile."));
            } finally {
                if (active) setLoading(false);
            }
        }
        void load();
        return () => { active = false; };
    }, [retry]);

    async function save(event: React.FormEvent) {
        event.preventDefault();
        if (inFlight.current) return;
        setSaved(false);
        if (name.trim().length < 2 || name.trim().length > 100) { setError("Name must be between 2 and 100 characters."); return; }
        inFlight.current = true; setSaving(true); setError("");
        try {
            const response = await authApi.updateCurrentUser({ displayName: name.trim(), primaryActivity: activity || null });
            setUser(response); setName(response.displayName); setActivity(response.primaryActivity ?? ""); setSaved(true);
        } catch (error) {
            setError(getApiError(error, "Failed to save profile."));
        } finally {
            inFlight.current = false; setSaving(false);
        }
    }

    if (loading) return <p className="page-message" role="status">Loading profile...</p>;
    return <div className="page profile-page"><div className="profile-heading"><h1>Profile</h1><p>Manage your profile details.</p></div><div className="page-card profile-card">
        {error && <p className="error-message" role="alert">{error}</p>}
        {!user ? <button className="secondary-button" onClick={() => setRetry((value) => value + 1)}>Retry</button> : <>
            <div className="profile-identity"><span className="profile-initials" aria-hidden="true">{user.displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                <div><strong>{user.displayName}</strong><span className="app-user-role">{user.role}</span></div></div>
            <div className="info-row"><span>Email</span><strong>{user.email}</strong></div>
            <form onSubmit={(event) => void save(event)} className="profile-form">
                <fieldset disabled={saving} className="form-fields" onChange={() => setSaved(false)}>
                    <div className="form-field"><label htmlFor="profile-name">Name</label>
                        <input id="profile-name" value={name} minLength={2} maxLength={100} required onChange={(event) => setName(event.target.value)} /></div>
                    <div className="form-field"><label htmlFor="profile-activity">Primary activity</label>
                        <SelectControl<ActivityType | ""> id="profile-activity" label="Primary activity" value={activity} disabled={saving} className="activity-control"
                            options={[{ value: "", label: "Not selected" }, ...ACTIVITY_TYPES.map((value) => ({ value, label: value === "BMX" ? "BMX" : value[0] + value.slice(1).toLowerCase() }))]}
                            onChange={(value) => { setActivity(value); setSaved(false); }} /></div>
                    <button className="primary-button" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button>
                </fieldset>
            </form>
            {saved && <p className="success-message" role="status">Profile saved.</p>}
        </>}
    </div></div>;
}
