import { SSTConfig } from 'sst';
import { gh } from './stacks/github/github';
import { devops } from './stacks/devops';
import { jira } from './stacks/jira/jira';
import { commonConfig } from './stacks/common/config';
import { Tags } from "aws-cdk-lib";

import { AppConfig, Stage } from './stacks/type/stack-config';

export default {
  config(): { name: string; region: string } {
    return {
      name: AppConfig.NAME,
      region: AppConfig.REGION,
    };
  },
  stacks(app): void | Promise<void> {

    Tags.of(app).add("Project_name", "pulse");
    Tags.of(app).add("Environment", app.stage);

    app.stack(commonConfig);
    app.stack(gh);
    app.stack(jira);
    app.stack(devops);

    if (app.stage !== Stage.LIVE) {
      app.setDefaultRemovalPolicy('destroy');
    }
  },
} satisfies SSTConfig;
