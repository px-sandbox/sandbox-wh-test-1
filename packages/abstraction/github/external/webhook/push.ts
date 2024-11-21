export type CommitIds = {
  id: string;
};

export type Push = {
  id: string;
  ref: string;
  pusherId: string;
  commits: CommitIds[];
  repoId: string;
  action?: string;
  orgId: string;
};
