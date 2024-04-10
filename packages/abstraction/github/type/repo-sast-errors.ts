type retryProcess = {
    processId?: string;
}

export type RepoSastErrors = retryProcess &
{
    _id: string;
    body: {
        errorMsg: string;
        ruleId: string;
        repoId: string;
        organizationId: string;
        branch: string;
        fileName: string;
        lineNumber: number;
        codeSnippet: string;
        date: string;
        createdAt: string;
        isDeleted: boolean;
    }
}
