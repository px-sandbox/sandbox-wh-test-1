type retryProcess = {
  processId?: string;
}
export type ActiveBranches = retryProcess & {
  id: string;
  body: {
    id: string;
    organizationId: string;
    repoId: string;
    branchesCount: number;
    createdAt: string;
  };
}

export interface RawActiveBRanches {
  repoId: string;
  organizationId: string;
  createdAt: string;
  branchesCount: number;
}
