export interface User {
  id: string;
  body: {
    id: string;
    githubUserId: number;
    userName: string;
    avatarUrl: string;
    organizationId: string;
    deletedAt: string;
  };
}
