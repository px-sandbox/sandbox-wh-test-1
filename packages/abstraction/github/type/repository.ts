import { actions } from './actions';
import { retryProcess } from './retry-process';

export type Repository = {
  id: string;
  githubId: number;
  name: string;
  description: string;
  private: boolean;
  visibility: string;
  owner: {
    login: string;
  };
  openIssuesCount: number;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  pushedAt: Date;
  deletedAt: Date;
}



export type RepoFormatter = retryProcess & {
  id: string;
  body: {
    id: string;
    githubRepoId: string;
    name: string;
    description: string;
    isPrivate: boolean;
    visibility: string;
    owner: string;
    openIssuesCount: number;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
    pushedAt: string;
    action: actions;
    createdAtDay: string;
    computationalDate: string;
    githubDate: string | Date;
  };
}
