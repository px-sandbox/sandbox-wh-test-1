export interface Organization {
  id: string;
  body: {
    id: string;
    githubOrganizationId: string;
    name: string;
    description: string;
    company: string;
    location: string;
    email: string;
    isVerified: boolean;
    hasOrganizationProjects: boolean;
    hasRepositoryProjects: boolean;
    publicRepos: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: boolean;
  };
}
