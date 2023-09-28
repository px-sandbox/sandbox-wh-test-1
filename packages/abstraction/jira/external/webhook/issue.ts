export type Issue = {
    id: string;
    self: string;
    key: string;
    organization: string;
    fields: {
        issuetype: {
            self: string;
            id: string;
            description: string;
            name: string;
            subtask: boolean;
            avatarId: number;
            entityId: string;
            heirarchyLevel: number;
        };
        timespent: number;
        project: {
            self: string;
            id  : string;
            key : string;
            name: string;
        };
        created: string;
        priority: {
            self: string;
            name: string;
            id  : string;
        };
        labels: Array<string>;
        timeestimate: number;
        issuelinks:[];
        assignee: {
            self: string;
            accountId: string;
            displayName: string;
            active: boolean;
            timeZone: string;
            accountType: string;
        };
        updated: string;
        status:{
            self: string;
            description: string;
            name: string;
            id: string;
        }
        timeoriginalestimate: number;
        creator: {
            self: string;
            accountId: string;
            displayName: string;
            active: boolean;
            timeZone: string;
            accountType: string;
        };
        subtasks: [
        ];
        reporter: {
            self: string;
            accountId: string;
            displayName: string;
            active: boolean;
            timeZone: string;
            accountType: string;
        };
        lastViewed: string;
    };
    isDeleted: boolean;
    deletedAt: string;
}