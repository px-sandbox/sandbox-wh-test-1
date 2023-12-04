import { SortKey, SortOrder } from "../../enums";

type BaseRepoType = {
    _id: string;
    repoId: string;
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
    repoName?: string;
    currVerDate?: string;
    currVer?: string;
    latestVer?: string;
    latestVerDate?: string;
    dateDiff?: number;
};

export type VerUpgradeRes = RepoLibType & {
    dateDiff?: number;

}

export type VerUpgFinalRes = {
    versionData: VerUpgradeRes[];
    totalPages?: number;
    page?: number;
}

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
};

export type LibraryRecord = {
    version: string;
    releaseDate: string;
    libName: string;
};