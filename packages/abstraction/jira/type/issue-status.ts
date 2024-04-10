type retryProcess = {
    processId?: string;
}

export type IssueStatus = retryProcess & {
    id: string;
    body: {
        id: string;
        issueStatusId: string;
        name: string;
        status: string;
        organizationId: string;
        pxStatus: string | null;
    };
};
