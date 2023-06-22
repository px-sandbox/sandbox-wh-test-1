export interface Branch {
  id: string;
  body: {
    id: string;
    githubBranchId: string;
    name: string;
    repoId: string;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
    pushedAt: string;
    deletedAt: string;
  };
}
