export type RepoSastErrors =
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
        processId?: string; 
    }
