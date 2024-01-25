import { SortKey, SortOrder } from "../../enums";

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
    key: SortKey;
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