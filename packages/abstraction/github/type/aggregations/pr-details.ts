import { SortOrder } from "../../enums";
import { PrDetailsSortKey } from "../../enums/version-upgrades";

export type prDetailsData = {
    prName: string;
    prRaisedAt: string;
    prPickedAt: string;
    prWaitTime: string;
    prlink: string;
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
    reviewedAt: string;
    reviewSeconds: number;
    repoId: string;
    pullNumber: string;
}

export enum PrDetailsSorting {
    prWaitTime = 'body.reviewSeconds',
    prPickedAt = 'body.reviewedAt',
    prRaisedAt = 'body.createdAt',
}