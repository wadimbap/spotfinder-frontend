import type { CommentResponse } from "./commentsTypes";

export function threadComments(comments: CommentResponse[]): { comment: CommentResponse; depth: number }[] {
    const ordered = [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id);
    const ids = new Set(ordered.map((comment) => comment.id));
    const children = new Map<number, CommentResponse[]>();
    const roots: CommentResponse[] = [];
    for (const comment of ordered) {
        if (comment.parentId == null || !ids.has(comment.parentId)) roots.push(comment);
        else {
            const replies = children.get(comment.parentId);
            if (replies) replies.push(comment);
            else children.set(comment.parentId, [comment]);
        }
    }
    const result: { comment: CommentResponse; depth: number }[] = [];
    const visited = new Set<number>();
    function append(root: CommentResponse) {
        const stack = [{ comment: root, depth: 0 }];
        while (stack.length) {
            const item = stack.pop()!;
            if (visited.has(item.comment.id)) continue;
            visited.add(item.comment.id); result.push(item);
            const replies = children.get(item.comment.id) ?? [];
            for (let index = replies.length - 1; index >= 0; index--) stack.push({ comment: replies[index], depth: item.depth + 1 });
        }
    }
    roots.forEach(append);
    // Keep malformed or incomplete threads visible without recursive loops.
    ordered.filter((comment) => !visited.has(comment.id)).forEach(append);
    return result;
}
