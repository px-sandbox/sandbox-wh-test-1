import { SSTConfig } from 'sst';
import { gh } from './stacks/github';
import { devops } from './stacks/devops';
import { jira } from './stacks/jira';
import { commonConfig } from './stacks/common/config';

enum Stage {
  SANDBOX = 'sandbox',
  LIVE = 'live',
}
enum AppConfig {
  NAME = 'pulse-dx',
  REGION = 'eu-west-1',
}
export default {
  config(): { name: string; region: string } {
    return {
      name: AppConfig.NAME,
      region: AppConfig.REGION,
    };
  },
  stacks(app): void | Promise<void> {
    app.stack(commonConfig);
    app.stack(gh);
    app.stack(jira);
    app.stack(devops);

    if (app.stage !== Stage.LIVE) {
      app.setDefaultRemovalPolicy('destroy');
    }
  },
} satisfies SSTConfig;
