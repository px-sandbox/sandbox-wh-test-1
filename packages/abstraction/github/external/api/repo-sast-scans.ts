type ScanErrors = {
    ruleId: string;
    message: string;
    location: string;
    lineNo: number;
    snippet: string;
};

export type RepoSastScans = {
    date: string;
    branch: string;
    repoId: string;
    organizationId: string;
    errors: ScanErrors[];
    createdAt: string;
};