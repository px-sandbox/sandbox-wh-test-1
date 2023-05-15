import { SSTConfig } from 'sst';
import { PulseDXIntegration } from './stacks/pulse-dx-intigration';

export default {
  config(_input) {
    return {
      name: 'pulse-dx-integration',
      region: _input.region || 'eu-west-1',
    };
  },
  stacks(app) {
    app.stack(PulseDXIntegration);
  },
} satisfies SSTConfig;
