export type Commit = {
  repoId: string;
  commits: Commits;
  commit: {
    message: string;
  };
  author: {
    login: string;
    id: string;
  };
  committer: {
    login: string;
    id: string;
  };
  stats: {
    total: string;
  };
  files: [
    {
      filename: string;
      additions: string;
      deletions: string;
      changes: string;
      status: string;
    }
  ];
};

export type Commits = {
  id: string;
  timestamp: string;
  url?: string;
};
