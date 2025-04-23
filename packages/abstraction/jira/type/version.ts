export interface Version {
  id: string; // Unique identifier for the version entry
  body: {
    projectId: string;
    name: string;
    description: string;
    archived: boolean;
    overdue: boolean;
    released: boolean;
    startDate: string;
    releaseDate: string;
    isDeleted?: boolean;
    deletedAt?: string;
    status?: string | null;
    projectKey?: string;
  };
}

export type VersionBody = {
  id: string;
  projectId: string;
  name: string;
  description: string;
  startDate: string;
  releaseDate: string;
  status?: string | null;
  organizationId: string;
  projectKey?: string;
};

// Type for the bucket in the map function
export interface VersionUpgradeBucket {
  key: {
    libName: string;
    version: string;
  };
  top_lib_hits: {
    hits: {
      hits: Array<{
        _source: {
          body: {
            repoId: string;
            releaseDate: string;
            [key: string]: unknown;
          };
        };
      }>;
    };
  };
}

// Type for the afterKey object
export interface VersionUpgradeAfterKey {
  libName: string;
  version: string;
}

// Type for the version upgrade response
export interface VersionUpgradeResponse {
  versionData: Array<{
    libName: string;
    version: string;
    repoId: string[];
    repoName: string[];
    currVerDate: string;
    currVer: string;
    latestVerDate: string;
    latestVer: string;
    dateDiff?: number;
    [key: string]: unknown;
  }>;
  afterKey: string;
}
