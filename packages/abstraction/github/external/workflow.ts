export type Workflow = {
    coreDependencies: {
        [key: string]: string;
    },
    repository_info: {
        repo_id: string;
        repo_name: string;
        repo_owner: string;
    },
    dependencies: {
        dependencyName: string;
        currentVersion: string;
    }[]
};