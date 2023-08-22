import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { RetryTableMapping } from '../model/retry-table-mapping';
import { ghRequest } from '../lib/request-default';
import { getInstallationAccessToken } from '../util/installation-access-token';

async function processIt(record: any): Promise<void> {
  const { processId, messageBody, queue, MessageDeduplicationId } = record;

  // send to queue
  await new SQSClient().sendMessage(JSON.parse(messageBody), queue, MessageDeduplicationId);

  // delete from dynamodb
  await new DynamoDbDocClient().delete(new RetryTableMapping().prepareDeleteParams(processId));
}

export async function handler(): Promise<void> {
  logger.info(`RetryProcessHandler invoked at: ${new Date().toISOString()}`);
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  const githubRetryLimit = await octokit('GET /rate_limit');
  if (githubRetryLimit.data && githubRetryLimit.data.rate.remaining > 3) {
    const itemsToPick = githubRetryLimit.data.rate.remaining / 3;
    const processes = await new DynamoDbDocClient().scan(
      new RetryTableMapping().prepareScanParams(itemsToPick)
    );

    if (processes.length === 0) {
      logger.info(`RetryProcessHandler no processes found at: ${new Date().toISOString()}`);
      return;
    }

    await Promise.all(processes.map((record: any) => processIt(record)));
  } else {
    logger.info('NO_REMANING_RATE_LIMIT', { githubRetryLimit: githubRetryLimit.data });
    return;
  }
}
