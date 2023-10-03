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
