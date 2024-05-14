import { Api, Cron, Function, StackContext, Table, use } from 'sst/constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { commonConfig } from '../common/config';

export function rp({ stack }: StackContext): {
  rpApi: Api<{
    // eslint-disable-next-line @typescript-eslint/ban-types
    admin: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
  }>;
  retryProcessTable: Table;
  rpCron: Cron;
} {
  const { NODE_VERSION, AUTH_PUBLIC_KEY } = use(commonConfig);
  const retryProcessTable = new Table(stack, 'processRetry', {
    fields: {
      processId: 'string',
    },
    primaryIndex: { partitionKey: 'processId' },
  });
  const retryProcess = new Function(stack, 'rp', {
    handler: 'packages/rp/src/service/retry-process.handler',
    runtime: NODE_VERSION,
    bind: [retryProcessTable],
  });
  retryProcess.attachPermissions([
    new iam.PolicyStatement({
      actions: ['sqs:*'],
      effect: iam.Effect.ALLOW,
      resources: ['*'],
    }),
  ]);
  const rpCron = new Cron(stack, 'cronRp', {
    schedule: 'cron(0/30 * ? * * *)',
    job: retryProcess,
  });
  const rpApi = new Api(stack, 'rpApi', {
    authorizers: {
      admin: {
        type: 'lambda',
        responseTypes: ['simple'],
        function: new Function(stack, 'fnRpAdminAuth', {
          handler: 'packages/auth/src/admin-auth.handler',
          bind: [AUTH_PUBLIC_KEY],
          runtime: NODE_VERSION,
        }),
      },
    },
    routes: {
      'GET /process/retry': {
        function: retryProcess,
        authorizer: 'admin',
      },
    },
  });

  stack.addOutputs({
    ApiEndpoint: rpApi.url,
  });

  return {
    rpApi,
    retryProcessTable,
    rpCron,
  };
}
