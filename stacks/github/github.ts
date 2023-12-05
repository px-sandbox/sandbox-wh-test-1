import { Api, Bucket, Function, StackContext } from 'sst/constructs';
import { initializeApi } from './api';
import { initializeCron } from './init-crons';
import { initializeFunctions } from './init-functions';
import { initializeDynamoDBTables } from './init-tables';
import { initializeQueue } from './queue/initialize';
import { HttpMethods } from 'aws-cdk-lib/aws-s3';
// eslint-disable-next-line max-lines-per-function,
export function gh({ stack }: StackContext): {
  ghAPI: Api<{
    // eslint-disable-next-line @typescript-eslint/ban-types
    universal: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
    // eslint-disable-next-line @typescript-eslint/ban-types
    admin: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
  }>;
} {
  /** Initialize DynamoDB Tables
   *
   */
  const { githubMappingTable, retryProcessTable, libMasterTable } = initializeDynamoDBTables(stack);
  /**
   * Initialize Bucket
   */
  const sastErrorsBucket = new Bucket(stack, "sastErrorBucket", {
    name: `${process.env.SST_STAGE}-sast-errors`,
    cors: [
      {
        allowedMethods: [HttpMethods.GET, HttpMethods.POST],
        allowedOrigins: ['*'],
      }]
  });
  /**
   *  Initialize Queues
   */
  const restQueues = initializeQueue(stack, { githubMappingTable, retryProcessTable, libMasterTable }, sastErrorsBucket);
  /**
   * Initialize Functions
   */
  const cronFunctions = initializeFunctions(
    stack,
    restQueues,
    { githubMappingTable, retryProcessTable, libMasterTable }
  );

  /**
   * Initialize Crons
   */
  initializeCron(
    stack,
    stack.stage,
    cronFunctions
  );

  const ghAPI = initializeApi(stack, restQueues, { githubMappingTable, retryProcessTable, libMasterTable }, sastErrorsBucket);

  stack.addOutputs({
    ApiEndpoint: ghAPI.url,
  });

  return {
    ghAPI,
  };
}
