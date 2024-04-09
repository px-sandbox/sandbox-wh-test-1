export type IssueStatus = {
    id: string;
    body: {
        id: string;
        issueStatusId: string;
        name: string;
        status: string;
        organizationId: string;
        pxStatus: string | null;
    };
    processId?: string; 
};
