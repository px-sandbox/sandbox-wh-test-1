import { actions } from './actions';

export type UserBody = {
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
  isDeleted: boolean;
};
export interface User {
  id: string;
  body: UserBody;
  processId?: string;
}
