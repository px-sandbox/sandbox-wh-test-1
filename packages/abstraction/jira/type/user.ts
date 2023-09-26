export type UserBody = {
  id: string;
  jiraUserId: string;
  emailAddress: string | null;
  userName: string | null;
  displayName: string;
  avatarUrls: {
    avatarUrl48x48: string;
    avatarUrl32x32: string;
    avatarUrl24x24: string;
    avatarUrl16x16: string;
  } | null;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  organizationId: string | null;
};
export interface User {
  id: string;
  body: UserBody;
}
