import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpotComments } from "../src/features/comments/SpotComments";
import { commentsApi } from "../src/features/comments/commentsApi";
import type { CommentResponse } from "../src/features/comments/commentsTypes";
import { threadComments } from "../src/features/comments/commentThreads";
import { spot, user } from "./fixtures";

vi.mock("../src/features/comments/commentsApi", () => ({ commentsApi: {
    getComments: vi.fn(), createComment: vi.fn(), updateComment: vi.fn(), deleteComment: vi.fn(),
} }));
const root: CommentResponse = { id: 1, parentId: null, text: "Root message", createdByUserId: user.id,
    createdByDisplayName: "Alex", createdAt: spot.createdAt, updatedAt: spot.createdAt, editedAt: null, deletedAt: null };
const reply: CommentResponse = { ...root, id: 2, parentId: 1, text: "A reply", createdByUserId: "other", createdByDisplayName: "Sam" };

beforeEach(() => { vi.resetAllMocks(); vi.mocked(commentsApi.getComments).mockResolvedValue([reply, root]); });

it("renders named threads and offers editing only to the author, including for admins", async () => {
    render(<SpotComments spotId={spot.id} currentUser={{ ...user, role: "ADMIN" }} />);
    await screen.findByText("Root message");
    expect(screen.getByText("Alex (You)")).toBeTruthy();
    expect(screen.getByText("Sam")).toBeTruthy();
    expect(screen.getByText("Reply to Alex")).toBeTruthy();
    expect(screen.getAllByText("Edit comment")).toHaveLength(1);
    expect(within(screen.getByRole("article", { name: "Comment by Sam" })).queryByText("Edit comment")).toBeNull();
});

it("creates a root comment with a null parent and clears only after success", async () => {
    vi.mocked(commentsApi.createComment).mockResolvedValue({ ...root, id: 3, text: "New root" });
    render(<SpotComments spotId={spot.id} currentUser={user} />);
    await screen.findByLabelText("Your comment");
    fireEvent.change(screen.getByLabelText("Your comment"), { target: { value: " New root " } });
    fireEvent.click(screen.getByText("Add comment"));
    await screen.findByText("New root");
    expect(commentsApi.createComment).toHaveBeenCalledWith(spot.id, { parentCommentId: null, text: "New root" });
    expect((screen.getByLabelText("Your comment") as HTMLTextAreaElement).value).toBe("");
});

it("sends replies with the selected parent's numeric ID", async () => {
    vi.mocked(commentsApi.createComment).mockResolvedValue({ ...root, id: 3, parentId: 2, text: "Nested answer" });
    render(<SpotComments spotId={spot.id} currentUser={user} />);
    await screen.findByText("A reply");
    fireEvent.click(within(screen.getByRole("article", { name: "Comment by Sam" })).getByText("Reply"));
    fireEvent.change(screen.getByLabelText("Reply to Sam"), { target: { value: "Nested answer" } });
    fireEvent.click(screen.getByText("Send reply"));
    await screen.findByText("Nested answer");
    expect(commentsApi.createComment).toHaveBeenCalledWith(spot.id, { parentCommentId: 2, text: "Nested answer" });
});

it("updates only ID and text and preserves the draft after a forbidden response", async () => {
    vi.mocked(commentsApi.updateComment).mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } })
        .mockResolvedValueOnce({ ...root, text: "Edited text", updatedAt: "2026-10-25T12:00:00Z", editedAt: "2026-10-25T12:00:00Z" });
    render(<SpotComments spotId={spot.id} currentUser={user} />);
    fireEvent.click(await screen.findByText("Edit comment"));
    fireEvent.change(screen.getByLabelText("Edit your comment"), { target: { value: "Edited text" } });
    fireEvent.click(screen.getByText("Save comment"));
    await screen.findByText(/do not have permission/);
    expect((screen.getByLabelText("Edit your comment") as HTMLTextAreaElement).value).toBe("Edited text");
    fireEvent.click(screen.getByText("Save comment"));
    await screen.findByText("Edited text");
    expect(commentsApi.updateComment).toHaveBeenLastCalledWith({ id: 1, text: "Edited text" });
    expect(screen.getByText("Edited")).toBeTruthy();
});

it("keeps the discussion unavailable on load errors and retries", async () => {
    vi.mocked(commentsApi.getComments).mockRejectedValueOnce({ isAxiosError: true, response: { status: 404, data: { message: "Spot not found" } } })
        .mockResolvedValueOnce([]);
    render(<SpotComments spotId={spot.id} currentUser={user} />);
    await screen.findByText("Spot not found");
    expect(screen.queryByLabelText("Your comment")).toBeNull();
    fireEvent.click(screen.getByText("Retry comments"));
    await screen.findByLabelText("Your comment");
});

it("does not allow blank comments or duplicate submissions while saving", async () => {
    let finish!: (value: CommentResponse) => void;
    vi.mocked(commentsApi.createComment).mockReturnValue(new Promise((done) => { finish = done; }));
    render(<SpotComments spotId={spot.id} currentUser={user} />);
    await screen.findByLabelText("Your comment");
    fireEvent.change(screen.getByLabelText("Your comment"), { target: { value: "   " } });
    expect((screen.getByText("Add comment") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Your comment"), { target: { value: "One request" } });
    fireEvent.click(screen.getByText("Add comment"));
    fireEvent.click(screen.getByText("Saving..."));
    expect(commentsApi.createComment).toHaveBeenCalledOnce();
    expect((screen.getAllByText("Reply")[0] as HTMLButtonElement).disabled).toBe(true);
    finish({ ...root, id: 4, text: "One request" });
    await screen.findByText("One request");
});

it("ignores a late response when a different spot is opened", async () => {
    let oldResponse!: (value: CommentResponse[]) => void;
    vi.mocked(commentsApi.getComments).mockReturnValueOnce(new Promise((done) => { oldResponse = done; })).mockResolvedValueOnce([]);
    const view = render(<SpotComments key="old" spotId="old" currentUser={user} />);
    view.rerender(<SpotComments key="new" spotId="new" currentUser={user} />);
    await screen.findByText(/No comments yet/);
    oldResponse([root]);
    await waitFor(() => expect(screen.queryByText("Root message")).toBeNull());
});

it("handles tied timestamps, missing parents and cycles deterministically", () => {
    expect(threadComments([reply, root]).map((item) => [item.comment.id, item.depth])).toEqual([[1, 0], [2, 1]]);
    expect(threadComments([{ ...root, parentId: 99 }])[0].depth).toBe(0);
    expect(threadComments([{ ...root, parentId: 2 }, reply]).map((item) => item.comment.id)).toEqual([1, 2]);
});

it("rejects oversized text without sending it and retains the draft", async () => {
    render(<SpotComments spotId={spot.id} currentUser={user} />);
    const input = await screen.findByLabelText("Your comment");
    fireEvent.change(input, { target: { value: "a".repeat(3001) } });
    fireEvent.submit(input.closest("form")!);
    expect(await screen.findByText(/between 1 and 3000/)).toBeTruthy();
    expect(commentsApi.createComment).not.toHaveBeenCalled();
    expect((input as HTMLTextAreaElement).value).toHaveLength(3001);
});

it("accepts the 3000-character boundary", async () => {
    const text = "a".repeat(3000);
    vi.mocked(commentsApi.createComment).mockResolvedValue({ ...root, id: 10, text });
    render(<SpotComments spotId={spot.id} currentUser={user} />);
    const input = await screen.findByLabelText("Your comment");
    fireEvent.change(input, { target: { value: text } });
    fireEvent.click(screen.getByText("Add comment"));
    await vi.waitFor(() => expect(commentsApi.createComment).toHaveBeenCalledWith(spot.id, { parentCommentId: null, text }));
    await screen.findByText(text);
});

it("shows deletion only for own comments to regular users", async () => {
    render(<SpotComments spotId={spot.id} currentUser={user} />);
    await screen.findByText("Root message");

    expect(within(screen.getByRole("article", { name: "Comment by Alex" })).getByRole("button", { name: "Delete comment", exact: true })).toBeTruthy();
    expect(within(screen.getByRole("article", { name: "Comment by Sam" })).queryByRole("button", { name: "Delete comment", exact: true })).toBeNull();
});

it.each(["MODERATOR", "ADMIN"] as const)("allows %s to delete others but not edit them", async (role) => {
    render(<SpotComments spotId={spot.id} currentUser={{ ...user, role }} />);
    await screen.findByText("A reply");
    const other = within(screen.getByRole("article", { name: "Comment by Sam" }));

    expect(other.getByRole("button", { name: "Delete comment", exact: true })).toBeTruthy();
    expect(other.queryByText("Edit comment")).toBeNull();
});

it("confirms deletion and preserves replies under a tombstone without exposing erased text", async () => {
    render(<SpotComments spotId={spot.id} currentUser={user} />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete comment", exact: true }));
    expect(commentsApi.deleteComment).not.toHaveBeenCalled();
    vi.mocked(commentsApi.deleteComment).mockResolvedValue();
    vi.mocked(commentsApi.getComments).mockResolvedValue([
        { ...root, text: "", deletedAt: "2026-10-26T10:00:00Z" }, reply,
    ]);

    fireEvent.click(screen.getByText("Confirm deletion"));

    await screen.findByText("Комментарий удалён");
    expect(commentsApi.deleteComment).toHaveBeenCalledWith(1);
    expect(screen.queryByText("Root message")).toBeNull();
    expect(screen.getByText("A reply")).toBeTruthy();
    expect(screen.getByText("Alex (You)")).toBeTruthy();
    const tombstone = within(screen.getByRole("article", { name: "Comment by Alex" }));
    expect(tombstone.queryByText("Reply")).toBeNull();
    expect(tombstone.queryByText("Edit comment")).toBeNull();
    expect(tombstone.queryByRole("button", { name: "Delete comment", exact: true })).toBeNull();
});

it("reloads the server list so pruned ancestors disappear and neighbouring discussions survive", async () => {
    const deletedRoot = { ...root, text: "", deletedAt: "2026-10-26T10:00:00Z" };
    const ownReply = { ...reply, createdByUserId: user.id };
    const neighbour = { ...root, id: 3, text: "Neighbour", createdByUserId: "other", createdByDisplayName: "Other" };
    vi.mocked(commentsApi.getComments).mockResolvedValueOnce([deletedRoot, ownReply, neighbour]);
    render(<SpotComments spotId={spot.id} currentUser={user} />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete comment", exact: true }));
    vi.mocked(commentsApi.deleteComment).mockResolvedValue();
    vi.mocked(commentsApi.getComments).mockResolvedValue([neighbour]);

    fireEvent.click(screen.getByText("Confirm deletion"));

    await waitFor(() => expect(screen.queryByText("Комментарий удалён")).toBeNull());
    expect(screen.queryByText("A reply")).toBeNull();
    expect(screen.getByText("Neighbour")).toBeTruthy();
});

it("does not mark deletion or an unchanged save as an edit", async () => {
    vi.mocked(commentsApi.getComments).mockResolvedValue([
        { ...root, updatedAt: "2026-10-26T10:00:00Z", editedAt: null },
        { ...reply, deletedAt: "2026-10-26T10:00:00Z", editedAt: "2026-10-25T10:00:00Z" },
    ]);
    render(<SpotComments spotId={spot.id} currentUser={user} />);
    await screen.findByText("Комментарий удалён");

    expect(screen.queryByText("Edited")).toBeNull();
});

it("retains the comment and permits retry after a failed delete", async () => {
    vi.mocked(commentsApi.deleteComment).mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } })
        .mockResolvedValueOnce();
    render(<SpotComments spotId={spot.id} currentUser={user} />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete comment", exact: true }));
    fireEvent.click(screen.getByText("Confirm deletion"));
    await screen.findByText(/do not have permission/);
    expect(screen.getByText("Root message")).toBeTruthy();
    vi.mocked(commentsApi.getComments).mockResolvedValue([reply, { ...root, text: "", deletedAt: "2026-10-26T10:00:00Z" }]);

    fireEvent.click(screen.getByText("Confirm deletion"));

    await screen.findByText("Комментарий удалён");
    expect(commentsApi.deleteComment).toHaveBeenCalledTimes(2);
});

it("keeps the list unchanged when deletion is cancelled", async () => {
    render(<SpotComments spotId={spot.id} currentUser={user} />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete comment", exact: true }));
    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(commentsApi.deleteComment).not.toHaveBeenCalled();
    expect(screen.getByText("Root message")).toBeTruthy();
});

it("blocks repeated deletions while the first request is pending", async () => {
    let finish!: () => void;
    vi.mocked(commentsApi.deleteComment).mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    render(<SpotComments spotId={spot.id} currentUser={user} />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete comment", exact: true }));
    fireEvent.click(screen.getByText("Confirm deletion"));
    fireEvent.click(screen.getByText("Deleting..."));
    expect(commentsApi.deleteComment).toHaveBeenCalledOnce();
    vi.mocked(commentsApi.getComments).mockResolvedValue([]);
    finish();
    await screen.findByText(/No comments yet/);
});

it("does not show stale text after deletion succeeds but reloading fails", async () => {
    vi.mocked(commentsApi.deleteComment).mockResolvedValue();
    render(<SpotComments spotId={spot.id} currentUser={user} />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete comment", exact: true }));
    vi.mocked(commentsApi.getComments).mockRejectedValue({ isAxiosError: true, response: { status: 500 } });

    fireEvent.click(screen.getByText("Confirm deletion"));

    await screen.findByText(/Comment deleted, but the discussion could not be refreshed/);
    expect(screen.queryByText("Root message")).toBeNull();
});

it("renders an edited badge from editedAt even when the generic timestamps match", async () => {
    const editedAt = "2026-10-26T12:00:00Z";
    vi.mocked(commentsApi.getComments).mockResolvedValue([{ ...root, editedAt }]);
    render(<SpotComments spotId={spot.id} currentUser={user} />);
    const badge = await screen.findByText("Edited");
    expect(badge.classList.contains("comment-edited-badge")).toBe(true);
    expect(badge.title).toBe(`Edited ${new Date(editedAt).toLocaleString()}`);
    const remove = screen.getByRole("button", { name: "Delete comment", exact: true });
    expect(remove.title).toBe("Delete comment");
    expect(remove.querySelector("svg")).toBeTruthy();
});

it("retains edited indicators for legacy responses without editedAt", async () => {
    const legacy = { ...root, updatedAt: "2026-10-26T12:00:00Z" };
    delete legacy.editedAt;
    vi.mocked(commentsApi.getComments).mockResolvedValue([legacy]);
    render(<SpotComments spotId={spot.id} currentUser={user} />);
    expect(await screen.findByText("Edited")).toBeTruthy();
});

it("shows no deletion controls before the current user has loaded", async () => {
    render(<SpotComments spotId={spot.id} currentUser={null} />);
    await screen.findByText("Root message");
    expect(screen.queryByRole("button", { name: "Delete comment", exact: true })).toBeNull();
});

it("closes only deletion confirmation with Escape and restores focus to its trash button", async () => {
    const keyboard = userEvent.setup();
    render(<SpotComments spotId={spot.id} currentUser={user} />);
    const remove = await screen.findByRole("button", { name: "Delete comment", exact: true });
    await keyboard.click(remove);
    const confirmation = screen.getByRole("alertdialog", { name: "Delete comment" });
    expect(confirmation.parentElement?.parentElement).toBe(document.body);
    await keyboard.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(document.activeElement).toBe(remove);
    expect(screen.getByText("Root message")).toBeTruthy();
    expect(commentsApi.deleteComment).not.toHaveBeenCalled();
});

it("keeps the draft through cancellation and a post-delete reload failure and retry", async () => {
    vi.mocked(commentsApi.deleteComment).mockResolvedValue();
    render(<SpotComments spotId={spot.id} currentUser={user} />);
    const input = await screen.findByLabelText("Your comment");
    fireEvent.change(input, { target: { value: "Keep my draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete comment", exact: true }));
    fireEvent.click(screen.getByText("Cancel"));
    expect((input as HTMLTextAreaElement).value).toBe("Keep my draft");
    fireEvent.click(screen.getByRole("button", { name: "Delete comment", exact: true }));
    vi.mocked(commentsApi.getComments).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([reply]);
    fireEvent.click(screen.getByText("Confirm deletion"));
    await screen.findByText(/Comment deleted, but the discussion could not be refreshed/);
    expect((screen.getByLabelText("Your comment") as HTMLTextAreaElement).value).toBe("Keep my draft");
    expect((input as HTMLTextAreaElement).disabled).toBe(true);
    fireEvent.click(screen.getByText("Retry comments"));
    await screen.findByText("A reply");
    expect((screen.getByLabelText("Your comment") as HTMLTextAreaElement).value).toBe("Keep my draft");
    expect((input as HTMLTextAreaElement).disabled).toBe(false);
});
