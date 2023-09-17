import { SSTConfig } from 'sst';
import { gh } from './stacks/github';
import { devops } from './stacks/devops';
import { AppConfig, Stage } from './stacks/type/stack-config';

export default {
  config(): { name: string; region: string } {
    return {
      name: AppConfig.NAME,
      region: AppConfig.REGION,
    };
  },
  stacks(app): void | Promise<void> {
    app.stack(gh);
    app.stack(devops);
    if (app.stage !== Stage.LIVE) {
      app.setDefaultRemovalPolicy('destroy');
    }
  },
} satisfies SSTConfig;
