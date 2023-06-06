export type Commit = {
  repoId: string;
  commits: Commits;
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
  message?: string;
  timestamp?: string;
  url?: string;
};
