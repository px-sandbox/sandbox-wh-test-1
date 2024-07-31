type Dependency = {
  dependencyName: string;
  currentVersion: string;
};
type retryProcess = {
  processId?: string;
};
export type RepoLibrary = retryProcess & {
  repositoryInfo: {
    repoId: string;
    repoName: string;
    repoOwner: string;
  };
  coreDependencies: Array<Dependency>;
  dependencies: Array<Dependency>;
};
