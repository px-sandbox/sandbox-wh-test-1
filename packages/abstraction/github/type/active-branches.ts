export interface ActiveBranches {
  id: string;
  body: {
    id: string;
    organizationId: string;
    repoId: string;
    branchesCount: number;
    createdAt: string;
  };
}
