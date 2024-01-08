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
        isDeleted?: boolean | null;
        deletedAt?: string | null;
        organizationId: string;
    };
};

export type ReopenRateDetails = {
    id: string;
    organizationId: string;
    issueId: string;
    issueKey: string;
    projectId: string | null;
    sprintId: string | null;
    boardId: string | null;
    reOpenCount: number;
    isReopen: boolean;
    isDeleted?: boolean | null;
    deletedAt?: string | null;
}


export type ReopenRateChangeLog = {
    field: string;
    fieldtype: string;
    fieldId: string;
    from: string;
    fromString: string;
    to: string;
    toString: string;
}

export type reopenIssueStatusIds = {
    Ready_For_Prod: string;
    QA_Pass_Deploy: string;
    Ready_For_QA: string;
    QA_Failed: string;
    QA_PASSED: string;
    Ready_For_UAT: string;
    Deployed_To_QA: string;
    Done: string;

}