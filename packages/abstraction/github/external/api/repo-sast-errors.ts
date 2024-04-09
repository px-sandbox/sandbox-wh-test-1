type SastError = {
    ruleId: string;
    message: string;
    location: string;
    lineNo: number;
    snippet: string;
};

export type RepoSastErrors = {
    date: string;
    branch: string;
    repoId: string;
    orgId: string;
    errors: SastError[];
    createdAt: string;
    processId: string;
};