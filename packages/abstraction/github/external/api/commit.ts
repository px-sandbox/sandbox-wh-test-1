import { Commits } from '../webhook';

export type Commit = {
  repoId: string;
  commits: Commits;
  commit: {
    message: string;
    author: {
      login: string;
      id: string;
    };
    committer: {
      login: string;
      date: string;
    };
  };
  stats: {
    total: string;
  };
  committer: {
    id: string;
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
