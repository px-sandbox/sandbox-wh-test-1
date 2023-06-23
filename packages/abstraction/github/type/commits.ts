export interface Commits {
  id: string;
  body: {
    id: string;
    githubCommitId: string;
    message: string;
    authorId: string;
    committedAt: string;
    changes?: CommitedFiles[];
    totalChanges: string;
    repoId: string;
    organizationId: string;
    createdAt: string;
  };
}
export type CommitedFiles = {
  filename: string;
  additions: string;
  deletions: string;
  changes: string;
  status: string;
};
