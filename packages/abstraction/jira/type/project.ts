type retryProcess = {
  processId?: string;
}

export type Project = retryProcess & {
  id: string;
  body: {
    id: string;
    projectId: string;
    key: string;
    name: string;
    avatarUrls: {
      avatarUrl48x48: string;
      avatarUrl32x32: string;
      avatarUrl24x24: string;
      avatarUrl16x16: string;
    } | null;
    lead: {
      accountId: string;
      avatarUrls: {
        avatarUrl48x48: string;
        avatarUrl32x32: string;
        avatarUrl24x24: string;
        avatarUrl16x16: string;
      } | null;
      displayName: string;
      active: boolean;
      timeZone: string;
      accountType: string;
    };
    organizationId: string;
    assigneeType: string;
    isDeleted?: boolean;
    deletedAt: string | null;
    updatedAt: string | null;
    createdAt: string | null;
  };
};
