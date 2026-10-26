import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CurrentUserResponse } from "../auth/authTypes";
import { commentsApi } from "./commentsApi";
import type { CommentResponse } from "./commentsTypes";
import { getApiError } from "../../shared/api/apiError";
import { threadComments } from "./commentThreads";
import { CommentEditor } from "./CommentEditor";
import { SpotDialog } from "../spots/SpotDialog";

type ActiveEditor = { mode: "reply" | "edit"; comment: CommentResponse } | null;
interface Props { spotId: string; currentUser: CurrentUserResponse | null }

export function SpotComments({ spotId, currentUser }: Props) {
    const [comments, setComments] = useState<CommentResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    const [editor, setEditor] = useState<ActiveEditor>(null);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<CommentResponse | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const mounted = useRef(false);
    const deleteInFlight = useRef(false);
    const [deleteOpener, setDeleteOpener] = useState<HTMLButtonElement | null>(null);
    const heading = useRef<HTMLHeadingElement>(null);
    const busy = saving || deleting;
    const warningId = useId();

    function canDeleteComment(comment: CommentResponse) {
        return !!currentUser && !comment.deletedAt && (currentUser.id === comment.createdByUserId
            || currentUser.role === "MODERATOR" || currentUser.role === "ADMIN");
    }

    function cancelDeletion() {
        if (deleting) return;
        setDeleteTarget(null); setDeleteError("");
    }

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    useEffect(() => {
        let active = true;
        async function load() {
            setLoading(true); setError("");
            try {
                const response = await commentsApi.getComments(spotId);
                if (active) { setComments(response); setHasLoaded(true); }
            } catch (error) {
                if (active) setError(getApiError(error, "Failed to load comments."));
            } finally { if (active) setLoading(false); }
        }
        void load();
        return () => { active = false; };
    }, [spotId, retry]);

    function saved(comment: CommentResponse) {
        setComments((current) => [...current.filter((item) => item.id !== comment.id), comment]);
    }

    async function confirmDeletion() {
        if (!deleteTarget || !canDeleteComment(deleteTarget) || deleteInFlight.current || saving) return;
        deleteInFlight.current = true;
        setDeleting(true); setDeleteError("");
        let removed = false;
        try {
            await commentsApi.deleteComment(deleteTarget.id);
            removed = true;
            if (!mounted.current) return;
            setDeleteTarget(null);
            // The server may also prune deleted ancestors, so reload the whole discussion.
            const response = await commentsApi.getComments(spotId);
            if (mounted.current) { setComments(response); heading.current?.focus({ preventScroll: true }); }
        } catch (error) {
            if (!mounted.current) return;
            if (removed) setError(getApiError(error, "Comment deleted, but the discussion could not be refreshed."));
            else setDeleteError(getApiError(error, "Failed to delete comment."));
        } finally {
            deleteInFlight.current = false;
            if (mounted.current) setDeleting(false);
        }
    }
    const name = (comment: CommentResponse) => comment.createdByDisplayName?.trim() || `User ${comment.createdByUserId.slice(0, 8)}`;
    const byId = new Map(comments.map((comment) => [comment.id, comment]));

    return <section className="spot-details-section comments-section" aria-label="Comments">
        <h2 ref={heading} tabIndex={-1}>Comments</h2>
        {loading && <p role="status">Loading comments...</p>}
        {error && <div role="alert"><p className="error-message">{error}</p>
            <button className="secondary-button" disabled={busy} onClick={() => setRetry((value) => value + 1)}>Retry comments</button></div>}
        {deleteTarget && createPortal(<SpotDialog role="alertdialog" label="Delete comment" describedBy={warningId} onClose={cancelDeletion} returnFocus={deleteOpener}>
            <section className="spots-panel comment-delete-dialog">
            <h2>Delete comment?</h2>
            <p id={warningId}>Delete this comment by <strong>{name(deleteTarget)}</strong>? Its text will be erased. Existing replies will be preserved.</p>
            {deleteError && <p role="alert" className="error-message">{deleteError}</p>}
            <div className="action-row">
                <button type="button" className="secondary-button" disabled={busy} onClick={cancelDeletion}>Cancel</button>
                <button type="button" className="reject-button" disabled={busy} onClick={() => void confirmDeletion()}>
                    {deleting ? "Deleting..." : "Confirm deletion"}
                </button>
            </div>
            </section>
        </SpotDialog>, document.body)}
        {!loading && !error && <>
            {!comments.length && <p className="field-help">No comments yet. Start the discussion.</p>}
            <div className="comment-list">{threadComments(comments).map(({ comment, depth }) => {
                const parent = comment.parentId == null ? null : byId.get(comment.parentId);
                const own = currentUser?.id === comment.createdByUserId;
                const deleted = Boolean(comment.deletedAt);
                const edited = comment.editedAt === undefined
                    ? comment.updatedAt !== comment.createdAt : Boolean(comment.editedAt);
                const active = editor?.comment.id === comment.id;
                return <article className={`comment${deleted ? " comment-deleted" : ""}`} key={comment.id} style={{ marginLeft: Math.min(depth, 4) * 12 }} aria-label={`Comment by ${name(comment)}`}>
                    <span className="comment-avatar" aria-hidden="true">{name(comment).slice(0, 1).toUpperCase()}</span>
                    <div className={`comment-meta${canDeleteComment(comment) ? " comment-meta-with-actions" : ""}`}><strong>{name(comment)}{own ? " (You)" : ""}</strong>
                        <time dateTime={comment.createdAt} title={new Date(comment.createdAt).toLocaleString()}>{new Date(comment.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</time>
                        {!deleted && edited && <span className="comment-edited-badge" title={comment.editedAt ? `Edited ${new Date(comment.editedAt).toLocaleString()}` : undefined}>Edited</span>}
                        {canDeleteComment(comment) && <button type="button" className="comment-delete-button" aria-label="Delete comment" title="Delete comment"
                            disabled={busy || editor !== null || deleteTarget !== null} onClick={(event) => { setDeleteOpener(event.currentTarget); setDeleteTarget(comment); setDeleteError(""); }}>
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 10v7m4-7v7" /></svg>
                        </button>}
                    </div>
                    {parent && <p className="field-help">Reply to {name(parent)}</p>}
                    <p className="comment-text">{deleted ? "Комментарий удалён" : comment.text}</p>
                    {currentUser && !deleted && <div className="action-row">
                        <button className="comment-link" disabled={busy || deleteTarget !== null} onClick={() => setEditor({ mode: "reply", comment })}>Reply</button>
                        {own && <button className="comment-link" disabled={busy || deleteTarget !== null} onClick={() => setEditor({ mode: "edit", comment })}>Edit comment</button>}
                    </div>}
                    {active && editor && !deleted && <CommentEditor key={`${editor.mode}-${comment.id}`} id={`${editor.mode}-${comment.id}`}
                        label={editor.mode === "edit" ? "Edit your comment" : `Reply to ${name(comment)}`}
                        submitLabel={editor.mode === "edit" ? "Save comment" : "Send reply"}
                        initialText={editor.mode === "edit" ? comment.text : ""}
                        onSubmit={(text) => editor.mode === "edit" ? commentsApi.updateComment({ id: comment.id, text })
                            : commentsApi.createComment(spotId, { parentCommentId: comment.id, text })}
                        onBusyChange={setSaving} onSaved={(response) => { saved(response); setEditor(null); }} onCancel={() => setEditor(null)} />}
                </article>;
            })}</div>
        </>}
            {hasLoaded && (currentUser ? <CommentEditor id={`new-comment-${spotId}`} label="Your comment" submitLabel="Add comment" compact
                disabled={loading || !!error || editor !== null || deleteTarget !== null || deleting} onBusyChange={setSaving}
                onSubmit={(text) => commentsApi.createComment(spotId, { parentCommentId: null, text })} onSaved={saved} />
                : <p className="field-help">Your account must be loaded before you can comment.</p>)}
    </section>;
}
