export const getMetadataSchema = {
  type: 'object',
  properties: {
    queryStringParameters: {
      type: 'object',
      properties: {
        orgName: { type: 'string' },
      },
      required: ['orgName'],
    },
    headers: {
      type: 'object',
      properties: {
        authorization: { type: 'string' },
      },
      required: ['authorization'],
    },
  },
};

export const getGitUserSchema = {
  type: 'object',
  properties: {
    pathParameters: {
      type: 'object',
      properties: {
        githubUserId: { type: 'string' },
      },
      required: ['githubUserId'],
    },
    headers: {
      type: 'object',
      properties: {
        authorization: { type: 'string' },
      },
      required: ['authorization'],
    },
  },
};

export const getGitRepoSchema = {
  type: 'object',
  properties: {
    pathParameters: {
      type: 'object',
      properties: {
        search: { type: 'string' },
      },
      required: ['search'],
    },
  },
};

export const prCommentsGraphSchema = {
  type: 'object',
  properties: {
    pathParameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        intervals: { type: 'string' },
      },
      required: ['startDate', 'endDate', 'intervals'],
    },
  },
};
