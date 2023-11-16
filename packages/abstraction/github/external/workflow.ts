export type Workflow = {
    engines: {
        [key: string]: string;
    },
    repository_info: {
        repo_id: string;
        repo_name: string;
        repo_owner: string;
    },
    dependencies: {
        [key: string]: {
            version: string;
            repo_url: string;
            owner: string;
            repo_name: string;
        };
    }
};