export type Project = {
    id: string;
    body:{ 
        id: string;
        projectId: number;
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
            accountType: string
        },
        organizationId: string;
        assigneeType: string
        isDeleted?: boolean;
        deletedAt: string | null;
        updatedAt: string | null;
    }
}