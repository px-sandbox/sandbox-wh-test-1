type ScanErrors = {
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
    errors: ScanErrors[];
    createdAt: string;
};