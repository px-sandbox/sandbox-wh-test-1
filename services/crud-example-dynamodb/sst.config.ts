import { SSTConfig } from 'sst';
import { API } from './stacks/my-stack';
import { Storage } from './stacks/storage';

export default {
  config(_input) {
    return {
      name: 'rest-api-ts',
      region: 'us-east-1',
    };
  },
  stacks(app) {
    app.stack(API);
    app.stack(Storage);
  },
} satisfies SSTConfig;
