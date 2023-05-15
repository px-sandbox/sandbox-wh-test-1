export type Repository = {
    id: string;
    name: string;
    description: string;
    private: boolean;
    visibility: string;
    owner: {
        login: string;
    };
    open_issues_count: number;
    organization_id: string;
    created_at: Date;
    updated_at: Date;
    pushed_at: Date;
    deleted_at: Date;
};
