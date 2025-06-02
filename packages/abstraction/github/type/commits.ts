import { retryProcess } from './retry-process';

export type CommitedFiles = {
  filename: string;
  additions: number;
  deletions: number;
  changes: number;
  status: string;
};

export type Commits = retryProcess & {
  id: string;
  body: {
    id: string;
    githubCommitId: string;
    isMergedCommit: boolean;
    pushedBranch: string | null;
    mergedBranch: string;
    message: string;
    authorId: string | null;
    committedAt: string;
    changes?: CommitedFiles[];
    totalChanges: string;
    repoId: string;
    organizationId: string;
    createdAt: string;
    createdAtDay: string;
    computationalDate: string;
    githubDate: string | Date;
  };
};
