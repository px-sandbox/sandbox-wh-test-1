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
