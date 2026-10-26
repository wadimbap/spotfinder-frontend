export function PhotoPlaceholder({ loading = false, unavailable = false }: { loading?: boolean; unavailable?: boolean }) {
    return <div className={`photo-placeholder${loading ? " photo-placeholder-loading" : ""}`} role={loading ? "status" : undefined}>
        <svg aria-hidden="true" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="7" y="7" width="34" height="34" rx="6" /><circle cx="18" cy="18" r="4" />
            <path d="m8 34 10-10 8 8 6-6 9 9" />
        </svg>
        <span>{loading ? "Loading photo…" : unavailable ? "Photo unavailable" : "No photo yet"}</span>
    </div>;
}
