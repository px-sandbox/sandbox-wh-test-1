import { Api, Bucket, Function, StackContext, use } from 'sst/constructs';
import { HttpMethods } from 'aws-cdk-lib/aws-s3';
import { initializeApi } from './api';
import { initializeCron } from './init-crons';
import { initializeFunctions } from './init-functions';
import { initializeDynamoDBTables } from './init-tables';
import { initializeQueue } from './queue/initialize';
import { rp } from '../rp/rp';
// eslint-disable-next-line max-lines-per-function,
export function gh({ stack }: StackContext): {
  ghAPI: Api<{
    // eslint-disable-next-line @typescript-eslint/ban-types
    universal: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
    // eslint-disable-next-line @typescript-eslint/ban-types
    admin: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
  }>;
} {

  const { retryProcessTable } = use(rp)
  /** Initialize DynamoDB Tables
   *
   */
  const { githubMappingTable, libMasterTable } = initializeDynamoDBTables(stack);
  /**
   * Initialize Bucket
   */
  const testCoverageReportsBucket=new Bucket(stack,'testCoverageReportsBucket',{
    name: `${process.env.SST_STAGE}-test-coverage-report`,
    cors: [
      {
        allowedMethods: [HttpMethods.GET, HttpMethods.POST],
        allowedOrigins: ['*'],
      },
    ],
  });
  const sastErrorsBucket = new Bucket(stack, 'sastErrorBucket', {
    name: `${process.env.SST_STAGE}-sast-errors`,
    cors: [
      {
        allowedMethods: [HttpMethods.GET, HttpMethods.POST],
        allowedOrigins: ['*'],
      },
    ],
  });
  const versionUpgradeBucket = new Bucket(stack, 'versionUpgradeBucket', {
    name: `${process.env.SST_STAGE}-version-upgrades`,
    cors: [
      {
        allowedMethods: [HttpMethods.GET, HttpMethods.POST],
        allowedOrigins: ['*'],
      },
    ],
  });
  /**
   *  Initialize Queues
   */
  const restQueues = initializeQueue(
    stack,
    { githubMappingTable, retryProcessTable, libMasterTable },
    { sastErrorsBucket, versionUpgradeBucket }
  );
  /**
   * Initialize Functions
   */
  const cronFunctions = initializeFunctions(stack, restQueues, {
    githubMappingTable,
    retryProcessTable,
    libMasterTable,
  });

  /**
   * Initialize Crons
   */
  initializeCron(stack, stack.stage, cronFunctions);

  const ghAPI = initializeApi(
    stack,
    restQueues,
    { githubMappingTable, retryProcessTable, libMasterTable },
    { sastErrorsBucket, versionUpgradeBucket,testCoverageReportsBucket }
  );

  stack.addOutputs({
    ApiEndpoint: ghAPI.url,
  });

  return {
    ghAPI,
  };
}
