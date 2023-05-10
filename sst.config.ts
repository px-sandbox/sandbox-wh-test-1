import { SSTConfig } from 'sst';
import { PxDataGithubIntegration } from './stacks/px-data-github-intigration';

export default {
  config(_input) {
    return {
      name: 'pulse-data-integration',
      region: _input.region || 'eu-west-1',
    };
  },
  stacks(app) {
    app.stack(PxDataGithubIntegration);
  },
} satisfies SSTConfig;
