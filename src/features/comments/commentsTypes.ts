export interface CommentResponse {
    id: number;
    parentId: number | null;
    text: string;
    createdByUserId: string;
    createdByDisplayName: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCommentRequest { parentCommentId: number | null; text: string }
export interface UpdateCommentRequest { id: number; text: string }
