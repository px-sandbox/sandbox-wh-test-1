export const createUserSchema = {
  type: 'object',
  properties: {
    body: {
      type: 'object',
      properties: {
        sku: { type: 'string' },
        title: { type: 'string' },
        category: { type: 'string' },
        subCategory: { type: 'string' },
      },
      required: ['sku', 'title', 'category', 'subCategory'],
    },
  },
};
