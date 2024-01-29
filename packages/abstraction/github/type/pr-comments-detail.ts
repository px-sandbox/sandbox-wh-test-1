export type CommentsDetailResponse = {
    pullNumber: number;
    title: string;
    createdAt: string;
    reviewedAt: string;
    reviewComments: number;
    repoId: string | number;
}

export type PRCommentsDetail = {
    page: number;
    totalPages: number;
    data: CommentsDetailResponse[];
}