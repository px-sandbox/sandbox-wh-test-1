export interface User {
  id: number;
  body: {
    id: string;
    githubUserId: number;
    userName: string;
    avatarUrl: string;
    organizationId: string;
    deletedAt: string;
  };
}
