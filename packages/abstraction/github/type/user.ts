export interface User {
  id: string;
  body: {
    id: string;
    action: Array<{ action: string; actionTime: string }>;
    githubUserId: number;
    userName: string;
    avatarUrl: string;
    organizationId: string;
    deletedAt?: string;
    createdAt: string | Date;
  };
}
