export interface Branch {
  id: string;
  githubId: number;
  name: string;
  repoId: string;
  organizationId: string;
  created_at: Date;
  updatedAt: Date;
  pushedAt: Date;
  deletedAt: Date;
}
