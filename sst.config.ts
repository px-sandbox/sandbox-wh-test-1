import { SSTConfig } from 'sst';
import { gh } from './stacks/github';
import { devops } from './stacks/devops';

export default {
  config(): { name: string; region: string } {
    return {
      name: 'pulse-dx',
      region: 'eu-west-1',
    };
  },
  stacks(app): void | Promise<void> {
    app.stack(gh);
    app.stack(devops);
    if (app.stage !== 'live') {
      app.setDefaultRemovalPolicy('destroy');
    }
  },
} satisfies SSTConfig;
