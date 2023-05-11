export const getMetadata = {
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
        token: { type: 'string' },
      },
      required: ['token'],
    },
  },
};
