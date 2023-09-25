export type Project = {
    id: string;
    body:{ 
        id: string;
        jiraProjectId: number;
        key: string;
        name: string;
        avatarUrls: {
            avatarUrl48x48: string;
            avatarUrl32x32: string;
            avatarUrl24x24: string;
            avatarUrl16x16: string;
          } | null;
        projectLead: {
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
        assigneeType: string
        isDeleted?: boolean;
        deletedAt: string;
        updatedAt: string;
    }
}