import { ChangelogItem } from "../webhook";

export type Changelogs = {
    id?: string;
    created?: string;
    items: ChangelogItem[]
}