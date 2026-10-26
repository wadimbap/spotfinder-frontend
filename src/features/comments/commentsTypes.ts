export interface CommentResponse {
    id: number;
    parentId: number | null;
    text: string;
    createdByUserId: string;
    createdByDisplayName: string;
    createdAt: string;
    updatedAt: string;
    editedAt?: string | null;
    deletedAt?: string | null;
}

export interface CreateCommentRequest { parentCommentId: number | null; text: string }
export interface UpdateCommentRequest { id: number; text: string }
