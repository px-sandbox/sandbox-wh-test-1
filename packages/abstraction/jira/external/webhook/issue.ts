import { IssueWebhookLinks } from './issue-links';
import { IssueSprint } from './sprint';

export type ChangelogItem = {
  field: string;
  fieldId: string;
  fieldtype: string;
  from: string;
  fromString: string;
  to: string;
  toString: string;
};

export type ChangelogWebhook = {
  id: string;
  items: ChangelogItem[];
};

export type Subtask = {
  id: string;
  key: string;
  self: string;
  fields: {
    issuetype: {
      self: string;
      id: string;
      description: string;
      iconUrl: string;
      name: string;
      subtask: boolean;
      avatarId: number;
      entityId: string;
      heirarchyLevel: number;
    };
    summary: string;
    status: {
      self: string;
      description: string;
      iconUrl: string;
      name: string;
      id: string;
    };
    priority: {
      self: string;
      iconUrl: string;
      name: string;
      id: string;
    };
  };
};
export type IssueLinkType = {
  destinationIssueId: string;
  id: string;
  issueLinkType: {
    id: number;
    inwardName: string;
    isSubTaskLinkType: boolean;
    isSystemLinkType: boolean;
    name: string;
    outwardName: string;
    style: string;
  };
  sourceIssueId: string;
  systemLink: boolean;
};

export type Issue = {
  id: string;
  self: string;
  key: string;
  fields: {
    customfield_11225: {
      id: string;
      name: string;
    };
    customfield_11226: {
      id: string;
      name: string;
    };
    customfield_10007: Array<IssueSprint>;
    issuetype: {
      self: string;
      id: string;
      description: string;
      name: string;
      subtask: boolean;
      avatarId: number;
      entityId: string;
      heirarchyLevel: number;
    };
    timespent: number;
    parent: {
      fields: {
        issuetype: {
          avatarId: number;
          description: string;
          hierarchyLevel: number;
          iconUrl: string;
          id: string;
          name: string;
          self: string;
          subtask: false;
        };
        priority: {
          iconUrl: string;
          id: string;
          name: string;
          self: string;
        };
        status: {
          description: string;
          iconUrl: string;
          id: string;
          name: string;
          self: string;
          statusCategory: {
            id: string;
            key: string;
            name: string;
            self: string;
          };
        };
        summary: string;
      };
      id: string;
      key: string;
      self: string;
    };
    fixVersions: Array<{
      id: string;
      name: string;
      description: string;
      releaseDate: string;
      archived: boolean;
      released: boolean;
    }>;
    versions: Array<{
      id: string;
      name: string;
      description: string;
      releaseDate: string;
    }>;
    project: {
      self: string;
      id: string;
      key: string;
      name: string;
      projectTypeKey: string;
    };
    created: string;
    priority: {
      self: string;
      name: string;
      id: string;
    };
    labels: Array<string>;
    timeestimate: number;
    issuelinks: Array<IssueWebhookLinks>;
    assignee: {
      self: string;
      accountId: string;
      displayName: string;
      active: boolean;
      timeZone: string;
      accountType: string;
    };
    updated: string;
    status: {
      self: string;
      description: string;
      name: string;
      id: string;
    };
    timeoriginalestimate: number;
    creator: {
      self: string;
      accountId: string;
      displayName: string;
      active: boolean;
      timeZone: string;
      accountType: string;
    };
    subtasks: Array<Subtask>;
    reporter: {
      self: string;
      accountId: string;
      displayName: string;
      active: boolean;
      timeZone: string;
      accountType: string;
    };
    lastViewed: string;
    summary: string;
    timestamp: string;
  };
  changelog: {
    id: string;
    items: ChangelogItem[];
  };
  isDeleted?: boolean;
  deletedAt?: string;
  organization: string;
  eventName: string;
  timestamp: string;
};

export type IssueUpdate = {
  id: string;
  self: string;
  key: string;
  fields: {
    issuetype: {
      self: string;
      id: string;
      description: string;
      name: string;
      subtask: boolean;
      avatarId: number;
      entityId: string;
      heirarchyLevel: number;
    };
    project: {
      self: string;
      id: string;
      key: string;
      name: string;
      projectTypeKey: string;
    };
  };
  changelog: {
    id: string;
    items: ChangelogItem[];
  };
};
