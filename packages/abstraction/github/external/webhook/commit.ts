export type Commits = {
  id: string;
  repoId: string;
  commit: {
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
