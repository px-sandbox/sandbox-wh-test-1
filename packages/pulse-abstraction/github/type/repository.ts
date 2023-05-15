export interface Repository {
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
