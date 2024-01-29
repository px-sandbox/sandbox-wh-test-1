import { SortOrder } from "../../enums";
import { PrDetailsSortKey } from "../../enums/version-upgrades";

export type prDetailsData = {
    id: string;
    name: string;
    prCreatedAt: string;
    prPickedAt: string;
    waitTime: string;
    link: string;
}
export type PrDetails = {
    data: prDetailsData[]
    page: number;
    totalPages: number;
};
export type PrDetailsSort = {
    key: PrDetailsSortKey;
    order: SortOrder;
}
export type PrDetailsGraph = {
    _id: string;
    title: string;
    createdAt: string;
    githubDate: string;
    reviewSeconds: number;
    repoId: string;
    pullNumber: string;
}

export enum PrDetailsSorting {
    waitTime = 'body.reviewSeconds',
    prPickedAt = 'body.githubDate',
    prCreatedAt = 'body.createdAt',
}