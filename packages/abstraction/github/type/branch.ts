import { actions } from './actions';

export interface Branch {
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
  };
}
