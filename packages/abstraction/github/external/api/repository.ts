export type Repository = {
    id: string;
    action?: string;
    name: string;
    description: string;
    private: boolean;
    visibility: string;
    owner: {
        login: string;
    };
    open_issues_count: number;
    organization_id: string;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    deleted_at?: string;
};
