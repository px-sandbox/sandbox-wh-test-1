export type ReopenRate = {
    id: string;
    body: {
        id: string;
        issueId: string;
        issueKey: string;
        projectId: string;
        projectKey: string;
        reOpenCount: number;
        isReopen: boolean;
        sprintId: string | null;
        boardId: string | null
        isDeleted?: boolean | null;
        deletedAt?: string | null;
        organizationId: string;
    };
};
