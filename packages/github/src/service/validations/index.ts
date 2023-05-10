export const getMetadata = {
  type: 'object',
  properties: {
    headers: {
      type: 'object',
      properties: {
        orgName: { type: 'string' },
      },
      required: ['orgName'],
    },
  },
};
