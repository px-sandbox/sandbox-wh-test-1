import { actions } from './actions';
import { retryProcess } from './retry-process';

export type Branch = retryProcess & {
  id: string;
  body: {
    id: string;
    githubBranchId: string;
    name: string;
    repoId: string;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
    pushedAt: string;
    deletedAt: string | null;
    action: actions;
    createdAtDay: string;
    computationalDate: string;
    githubDate: string | Date;
    protected: boolean;
    isDeleted: boolean;
  };
};

export type BranchRep = retryProcess & {
  _id: string;
  id: string;
  githubBranchId: string;
  name: string;
  repoId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  deletedAt: string | null;
  action: actions;
  createdAtDay: string;
  computationalDate: string;
  githubDate: string | Date;
  protected: boolean;
  isDeleted: boolean;
};
