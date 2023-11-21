type Dependency = {
    dependencyName: string;
    currentVersion: string;
}
export type RepoLibrary = {
    repositoryInfo: {
        repoId: string;
        repoName: string;
        repoOwner: string;
    },
    coreDependencies: Array<Dependency>,
    dependencies: Array<Dependency>
};