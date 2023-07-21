import { actions } from './actions';

export interface User {
  id: string;
  body: {
    id: string;
    action: actions;
    githubUserId: number;
    userName: string;
    avatarUrl: string;
    organizationId: string;
    deletedAt?: string;
    createdAt: string | Date;
    createdAtDay: string;
    computationalDate: string;
    githubDate: string | Date;
    timezone?: string;
  };
}
