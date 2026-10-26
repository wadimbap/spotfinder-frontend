import { useEffect, useRef, useState } from "react";
import { getApiError } from "../../shared/api/apiError";
import type { CommentResponse } from "./commentsTypes";

interface Props {
    id: string; label: string; submitLabel: string; initialText?: string;
    onSubmit: (text: string) => Promise<CommentResponse>;
    onSaved: (comment: CommentResponse) => void; onCancel?: () => void;
    disabled?: boolean; onBusyChange?: (busy: boolean) => void;
    compact?: boolean;
}

export function CommentEditor({ id, label, submitLabel, initialText = "", onSubmit, onSaved, onCancel, disabled, onBusyChange, compact = false }: Props) {
    const [text, setText] = useState(initialText);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const inFlight = useRef(false);
    const mounted = useRef(false);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        if (inFlight.current || disabled) return;
        if (!text.trim() || text.length > 3000) { setError("Enter a comment between 1 and 3000 characters."); return; }
        inFlight.current = true; setBusy(true); setError(""); onBusyChange?.(true);
        try {
            const response = await onSubmit(text.trim());
            if (mounted.current) { setText(""); onSaved(response); }
        } catch (error) {
            if (mounted.current) setError(getApiError(error, "Failed to save comment."));
        } finally {
            inFlight.current = false; if (mounted.current) { setBusy(false); onBusyChange?.(false); }
        }
    }

    return <form className={`comment-editor${compact ? " comment-editor-compact" : ""}`} onSubmit={(event) => void submit(event)}>
        <div className="form-field"><label className={compact ? "sr-only" : undefined} htmlFor={id}>{label}</label>
            <textarea id={id} rows={compact ? 1 : 3} placeholder={compact ? "Write a comment…" : undefined} value={text} required maxLength={3000} disabled={busy || disabled} onChange={(event) => setText(event.target.value)}
                aria-describedby={`${id}-count`} />
            <span id={`${id}-count`} className="field-help">{text.length}/3000</span></div>
        {error && <p role="alert" className="error-message">{error}</p>}
        <div className="action-row"><button className={compact ? "primary-button" : "secondary-button"} disabled={busy || disabled || !text.trim()}>{busy ? "Saving..." : submitLabel}</button>
            {onCancel && <button type="button" className="secondary-button" disabled={busy} onClick={onCancel}>Cancel</button>}</div>
    </form>;
}
