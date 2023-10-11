import { ChangelogItem } from '../external/webhook';

export type Issue = {
  id: string;
  body: {
    id: string;
    issueId: string;
    issueKey: string;
    projectId: string;
    projectKey: string;
    isFTP: boolean;
    isFTF: boolean;
    reOpenCount: number;
    issueType: string;
    isPrimary: boolean;
    priority: string;
    label: Array<string>;
    issueLinks: Array<string>;
    assigneeId: string;
    reporterId: string;
    creatorId: string;
    status: string;
    subtasks: Array<string>;
    createdDate: string;
    lastViewed: string;
    lastUpdated: string;
    sprintId: string | null;
    boardId: string | null
    isDeleted?: boolean | null;
    deletedAt?: string | null;
    organizationId: string;
    changelog: { items: ChangelogItem[] };
  };
};
