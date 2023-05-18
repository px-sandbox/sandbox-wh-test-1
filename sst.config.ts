import { SSTConfig } from 'sst';
import { gh } from './stacks/github';

export default {
  config(_input) {
    return {
      name: 'pulse-dx',
      region: _input.region || 'eu-west-1',
    };
  },
  stacks(app) {
    app.stack(gh);
  },
} satisfies SSTConfig;
