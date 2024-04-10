type SastError = {
    ruleId: string;
    message: string;
    location: string;
    lineNo: number;
    snippet: string;
};
type retryProcess = {
    processId: string;
};
export type RepoSastErrors = retryProcess & {
    date: string;
    branch: string;
    repoId: string;
    orgId: string;
    errors: SastError[];
    createdAt: string;
} 