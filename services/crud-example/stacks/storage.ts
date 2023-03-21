import { Table } from 'sst/constructs';

export function Storage({ stack, app }) {
  const table = new Table(stack, 'CrudTest', {
    fields: {
      id: 'string',
      field1: 'string',
      field2: 'string',
    },
    primaryIndex: { partitionKey: 'id' },
  });

  return {
    table,
  };
}
