export interface Commits {
  id: string;
  body: {
    id: string;
    githubCommitId: string;
    message: string;
    authorId: string;
    committedAt: string;
    changes: {
      filename: string;
      additions: string;
      deletions: string;
      changes: string;
      status: string;
    };
    totalChanges: string;
    repoId: string;
    organizationId: string;
    createdAt: string;
    deletedAt: boolean;
  };
}
