import { ApiHandler } from 'sst/node/api';

export const lambda = ApiHandler(async (_evt) => {
  return {
    body: `Hello world.`,
  };
});
