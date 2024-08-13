export type BranchList = [
  {
    id?: string;
    repo_id?: string;
    name: string;
    commit: {
      sha: string;
      url: string;
    };
    protected: boolean;
    orgId?: string;
  }
];
