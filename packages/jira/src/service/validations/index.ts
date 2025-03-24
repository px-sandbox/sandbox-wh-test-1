import { Jira } from 'abstraction';

export const getProjectsSchema = {
  type: 'object',
  properties: {
    pathParameters: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        size: { type: 'string' },
        page: { type: 'string' },
      },
      required: ['size', 'page'],
    },
  },
};

export const getBoardsSchema = {
  type: 'object',
  properties: {
    queryStringParameters: {
      type: 'object',
      properties: {
        orgId: {
          type: 'string',
          pattern: '^jira_org_.*$',
        },
        projectId: {
          type: 'string',
          pattern: '^jira_project_.*$',
        },
      },
      required: ['orgId', 'projectId'],
    },
  },
};

export const updateIssueStatusSchema = {
  type: 'object',
  properties: {
    queryStringParameters: {
      type: 'object',
      properties: {
        issueStatusDocId: {
          type: 'string',
        },
        pxStatus: {
          type: 'string',
        },
      },
      required: ['issueStatusDocId', 'pxStatus'],
    },
  },
};

export const CycleTimeOverallValidator = {
  type: 'object',
  properties: {
    queryStringParameters: {
      type: 'object',
      properties: {
        orgId: {
          type: 'string',
          pattern:
            '^jira_org_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
        },
        projectId: {
          type: 'string',
          pattern: '^jira_project_\\d+$',
        },
        sprintIds: {
          type: 'string',
          pattern: '^jira_sprint_\\d+(,jira_sprint_\\d+)*$',
        },
        versionIds: {
          type: 'string',
          pattern: '^jira_version_\\d+(,jira_version_\\d+)*$',
        },
      },
      required: ['orgId', 'projectId'],
    },
  },
};

export const CycleTimeSummaryValidator = {
  type: 'object',
  properties: {
    queryStringParameters: {
      type: 'object',
      properties: {
        orgId: {
          type: 'string',
          pattern:
            '^jira_org_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
        },
        projectId: {
          type: 'string',
          pattern: '^jira_project_\\d+$',
        },
        sprintIds: {
          type: 'string',
          pattern: '^jira_sprint_\\d+(,jira_sprint_\\d+)*$',
        },
        sortKey: { type: 'string', enum: Object.values(Jira.Enums.CycleTimeSortKey) },
        sortOrder: { type: 'string', enum: Object.values(['asc', 'desc']) },
        type: { type: 'string', enum: Object.values(Jira.Enums.CycleTimeSummaryType) },
        versionIds: {
          type: 'string',
          pattern: '^jira_version_\\d+(,jira_version_\\d+)*$',
        },
      },
      required: ['orgId', 'projectId', 'type'],
    },
  },
};

export const CycleTimeDetailedValidator = {
  type: 'object',
  properties: {
    queryStringParameters: {
      type: 'object',
      properties: {
        sprintId: {
          type: 'string',
          pattern: '^jira_sprint_\\d+$',
        },
        versionId: {
          type: 'string',
          pattern: '^jira_version_\\d+$',
        },
        sortKey: { type: 'string', enum: Object.values(Jira.Enums.CycleTimeSortKey) },
        sortOrder: { type: 'string', enum: Object.values(['asc', 'desc']) },
        orgId: {
          type: 'string',
          pattern:
            '^jira_org_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
        },
      },
      required: ['orgId'],
    },
  },
};
