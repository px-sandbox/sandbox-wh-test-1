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