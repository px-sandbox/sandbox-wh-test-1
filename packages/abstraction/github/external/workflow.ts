export type Workflow = {
    coreDependencies: {
        dependencyName: string;
        currentVersion: string;
    }[],
    repositoryInfo: {
        repoId: string;
        repoName: string;
        repoOwner: string;
    },
    dependencies: {
        dependencyName: string;
        currentVersion: string;
    }[]
};