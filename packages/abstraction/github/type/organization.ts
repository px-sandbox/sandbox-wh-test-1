export interface Organization {
  id: string;
  body: {
    id: string;
    githubOrganizationId: number;
    name: string;
    installationId: number;
    appId: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    isDeleted: boolean;
  };
}
