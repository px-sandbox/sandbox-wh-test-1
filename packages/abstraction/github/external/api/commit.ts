import { Commits } from '../webhook';

export type Commit = {
  repoId: string;
  commits: Commits;
  timestamp: string;
  author: {
    login: string;
    id: string;
  };
  commit: {
    message: string;
    committer: {
      id: number;
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
      additions: number;
      deletions: number;
      changes: number;
      status: string;
    }
  ];
  action?: string;
};
