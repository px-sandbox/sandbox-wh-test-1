export type IssueStatus = {
    id: string;
    name: string;
    statusCategory: string;
    scope: {
        type: string;
    };
    description: string;
    organization: string;
};
