export type PRCommentsDetail = {
    pullNumber: number;
    title: string;
    createdAt: string;
    reviewedAt: string;
    reviewComments: number;
    repoId: string | number;
}