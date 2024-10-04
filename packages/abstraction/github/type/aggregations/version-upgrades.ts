import { SortKey, SortOrder } from '../../enums';

type BaseRepoType = {
  _id: string;
  repoId: string[];
  organizationId: string;
  version: string;
  name: string;
  libName: string;
  releaseDate: string;
  isDeleted: boolean;
  isCore: boolean;
};

export type VersionUpgradeSortType = {
  key: SortKey;
  order: SortOrder;
};

export type RepoLibType = BaseRepoType & {
  repoNames?: string[];
  currVerDate?: string;
  currVer?: string;
  latestVer?: string;
  latestVerDate?: string;
  dateDiff?: number;
};

export type ESVersionUpgradeType = {
  updatedRepoLibs: RepoLibType[];
  libNames: string[];
  afterKeyObj: string;
};

export type VerUpgradeRes = RepoLibType & {
  dateDiff?: number;
};

export type VerUpgFinalRes = {
  versionData: VerUpgradeRes[];
  afterKey: string;
};

export type RepoNameType = {
  _id: string;
  id: string;
  githubRepoId: number;
  name: string;
  description: string | null;
  isPrivate: boolean;
  owner: string;
  visibility: string;
  organizationId: string;
  openIssuesCount: number;
  topics: string[];
  createdAt: string;
  pushedAt: string;
  updatedAt: string;
  action: Array<object>;
  createdAtDay: string;
  computationalDate: string;
  githubDate: string;
  isDeleted: boolean;
};

export type DDRecordType = {
  version: string;
  releaseDate: string;
  libName: string;
  isDeprecated: boolean;
};

export type LibraryRecord = {
  version: string;
  releaseDate: string;
  libName: string;
  isDeprecated: boolean;
};

export type VersionUpgradeAggregation = {
  aggregations: { by_libName: { buckets: []; after_key: object } };
};

export type CoreLib = {
  libs: RepoLibType[];
  libNames: string[];
};
