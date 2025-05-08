import { retryProcess } from './retry-process';

export type ActiveBranches = retryProcess & {
  id: string;
  body: {
    id: string;
    organizationId: string;
    repoId: string;
    branchesCount: number;
    createdAt: string;
  };
};

export interface RawActiveBRanches {
  repoId: string;
  organizationId: string;
  createdAt: string;
  branchesCount: number;
}

export interface ActiveBranchDetails {
  id: string;
  name: string;
  lastCommitDate: string;
  author: { id: string; name: string };
  prStatus: string;
  createdSince: string;
  createdAt?: string;
}
