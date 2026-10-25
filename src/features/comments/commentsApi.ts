import { apiClient } from "../../shared/api/apiClient";
import type { CommentResponse, CreateCommentRequest, UpdateCommentRequest } from "./commentsTypes";

export const commentsApi = {
    async getComments(spotId: string): Promise<CommentResponse[]> {
        const response = await apiClient.get<CommentResponse[]>("/api/v1/comment", { params: { spotId } });
        return response.data;
    },
    async createComment(spotId: string, request: CreateCommentRequest): Promise<CommentResponse> {
        const response = await apiClient.post<CommentResponse>("/api/v1/comment", request, { params: { spotId } });
        return response.data;
    },
    async updateComment(request: UpdateCommentRequest): Promise<CommentResponse> {
        const response = await apiClient.put<CommentResponse>("/api/v1/comment", request);
        return response.data;
    },
};
