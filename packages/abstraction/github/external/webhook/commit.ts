export type Commits = {
  repoId: string;
  commits: {
    id: string;
    message: string;
    timestamp: string;
    url: string;
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
