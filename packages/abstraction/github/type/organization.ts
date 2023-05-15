export interface Organization {
  id: string;
  githubId: string;
  name: string;
  description: string;
  company: string;
  location: string;
  email: string;
  isVerified: boolean;
  hasOrganizationProjects: boolean;
  hasRepositoryProjects: boolean;
  publicRepos: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}
