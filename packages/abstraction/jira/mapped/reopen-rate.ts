import { ChangelogItem } from "../external/webhook/issue";

export type ReopenRateIssue = {
    _id: string;
    issue: {
        id: string;
        self: string;
        key: string;
        fields: {
            project: {
                self: string;
                id: string;
                key: string;
                name: string;
            };
            created: string;
        };
    }
    changelog: {
        id: string;
        items: ChangelogItem[];
    };
    isDeleted?: boolean;
    deletedAt?: string;
    organization: string;
    reOpenCount: number;
    isReopen: boolean;
    sprintId: string;
};
