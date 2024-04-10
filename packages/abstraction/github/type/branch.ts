import { actions } from './actions';

type retryProcess = {
  processId?: string;
}
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
    deletedAt: string;
    action: actions;
    createdAtDay: string;
    computationalDate: string;
    githubDate: string | Date;
    protected: boolean;
    isDeleted: boolean;
  };
}
