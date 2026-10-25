import { useEffect, useState } from "react";
import type { CurrentUserResponse } from "../auth/authTypes";
import { commentsApi } from "./commentsApi";
import type { CommentResponse } from "./commentsTypes";
import { getApiError } from "../../shared/api/apiError";
import { threadComments } from "./commentThreads";
import { CommentEditor } from "./CommentEditor";

type ActiveEditor = { mode: "reply" | "edit"; comment: CommentResponse } | null;
interface Props { spotId: string; currentUser: CurrentUserResponse | null }

export function SpotComments({ spotId, currentUser }: Props) {
    const [comments, setComments] = useState<CommentResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    const [editor, setEditor] = useState<ActiveEditor>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let active = true;
        async function load() {
            setLoading(true); setError("");
            try {
                const response = await commentsApi.getComments(spotId);
                if (active) setComments(response);
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
    const name = (comment: CommentResponse) => comment.createdByDisplayName?.trim() || `User ${comment.createdByUserId.slice(0, 8)}`;
    const byId = new Map(comments.map((comment) => [comment.id, comment]));

    return <section className="spot-details-section comments-section" aria-label="Comments">
        <h2>Comments</h2>
        {loading && <p role="status">Loading comments...</p>}
        {error && <div role="alert"><p className="error-message">{error}</p>
            <button className="secondary-button" onClick={() => setRetry((value) => value + 1)}>Retry comments</button></div>}
        {!loading && !error && <>
            {!comments.length && <p className="field-help">No comments yet. Start the discussion.</p>}
            <div className="comment-list">{threadComments(comments).map(({ comment, depth }) => {
                const parent = comment.parentId == null ? null : byId.get(comment.parentId);
                const own = currentUser?.id === comment.createdByUserId;
                const active = editor?.comment.id === comment.id;
                return <article className="comment" key={comment.id} style={{ marginLeft: Math.min(depth, 4) * 12 }} aria-label={`Comment by ${name(comment)}`}>
                    <div className="comment-meta"><strong>{name(comment)}{own ? " (You)" : ""}</strong>
                        <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time>
                        {comment.updatedAt !== comment.createdAt && <span>Edited</span>}</div>
                    {parent && <p className="field-help">Reply to {name(parent)}</p>}
                    <p className="comment-text">{comment.text}</p>
                    {currentUser && <div className="action-row">
                        <button className="comment-link" disabled={saving} onClick={() => setEditor({ mode: "reply", comment })}>Reply</button>
                        {own && <button className="comment-link" disabled={saving} onClick={() => setEditor({ mode: "edit", comment })}>Edit comment</button>}
                    </div>}
                    {active && editor && <CommentEditor key={`${editor.mode}-${comment.id}`} id={`${editor.mode}-${comment.id}`}
                        label={editor.mode === "edit" ? "Edit your comment" : `Reply to ${name(comment)}`}
                        submitLabel={editor.mode === "edit" ? "Save comment" : "Send reply"}
                        initialText={editor.mode === "edit" ? comment.text : ""}
                        onSubmit={(text) => editor.mode === "edit" ? commentsApi.updateComment({ id: comment.id, text })
                            : commentsApi.createComment(spotId, { parentCommentId: comment.id, text })}
                        onBusyChange={setSaving} onSaved={(response) => { saved(response); setEditor(null); }} onCancel={() => setEditor(null)} />}
                </article>;
            })}</div>
            {currentUser ? <CommentEditor id={`new-comment-${spotId}`} label="Your comment" submitLabel="Add comment"
                disabled={editor !== null} onBusyChange={setSaving}
                onSubmit={(text) => commentsApi.createComment(spotId, { parentCommentId: null, text })} onSaved={saved} />
                : <p className="field-help">Your account must be loaded before you can comment.</p>}
        </>}
    </section>;
}
