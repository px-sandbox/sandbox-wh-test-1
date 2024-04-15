import { retryProcess } from '../../type/retry-process';
type SastError = {
    ruleId: string;
    message: string;
    location: string;
    lineNo: number;
    snippet: string;
};

export type RepoSastErrors = retryProcess & {
    date: string;
    branch: string;
    repoId: string;
    orgId: string;
    errors: SastError[];
    createdAt: string;
} 