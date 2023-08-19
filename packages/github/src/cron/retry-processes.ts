import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { ghRequest } from 'src/lib/request-defaults';
import { RetryTableMapping } from 'src/model/retry-table-mapping';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';

export async function handler() {
  logger.info(`RetryProcessHandler invoked at: ${new Date().toISOString()}`);
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  const githubRetryLimit = await octokit('GET /rate_limit');
  if (githubRetryLimit.data && githubRetryLimit.data.rate.remaining === 0) {
    logger.info('NO_REMANING_RATE_LIMIT', { githubRetryLimit: githubRetryLimit.data });
    return false;
  }
  const processes = await new DynamoDbDocClient().scan(
    new RetryTableMapping().prepareScanParams(1000)
  );

  if (processes.length === 0) {
    logger.info(`RetryProcessHandler no processes found at: ${new Date().toISOString()}`);
    return;
  }

  await Promise.all(processes.map((record: any) => processIt(record)));
}

async function processIt(record: any): Promise<void> {
  const { processId, messageBody, queue, MessageDeduplicationId } = record;

  // send to queue
  await new SQSClient().sendMessage(JSON.parse(messageBody), queue, MessageDeduplicationId);

  // delete from dynamodb
  await new DynamoDbDocClient().delete(new RetryTableMapping().prepareDeleteParams(processId));
}
