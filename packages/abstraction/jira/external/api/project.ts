export type Project = {
        self: string;
        id: number;
        key: string;
        name: string;
        avatarUrls: {
            '48x48': string;
            '24x24': string;
            '16x16': string;
            '32x32': string
        },
        lead: {
            self: string;
            accountId: string;
            avatarUrls: {
                '48x48': string;
                '24x24': string;
                '16x16': string;
                '32x32': string;
            },
            displayName: string;
            active: boolean;
            timeZone: string;
            accountType: string;
        },
        organization: string;
        assigneeType: string
        isDeleted?: boolean;
        deletedAt: string | null;
        updatedAt: string | null;
}