export type Push = {
  id: string;
  ref: string;
  pusherId: string;
  commits: CommitIds[];
  organizationId: string;
  repoId: string;
  action: string;
};

export type CommitIds = {
  id: string;
};
