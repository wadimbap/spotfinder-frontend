import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { SpotComments } from "../src/features/comments/SpotComments";
import { commentsApi } from "../src/features/comments/commentsApi";
import type { CommentResponse } from "../src/features/comments/commentsTypes";
import { threadComments } from "../src/features/comments/commentThreads";
import { spot, user } from "./fixtures";

vi.mock("../src/features/comments/commentsApi", () => ({ commentsApi: {
    getComments: vi.fn(), createComment: vi.fn(), updateComment: vi.fn(),
} }));
const root: CommentResponse = { id: 1, parentId: null, text: "Root message", createdByUserId: user.id,
    createdByDisplayName: "Alex", createdAt: spot.createdAt, updatedAt: spot.createdAt };
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
        .mockResolvedValueOnce({ ...root, text: "Edited text", updatedAt: "2026-10-25T12:00:00Z" });
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
