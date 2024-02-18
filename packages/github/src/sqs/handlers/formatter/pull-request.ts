import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { ghRequest } from 'src/lib/request-default';
import { getInstallationAccessToken } from 'src/util/installation-access-token';
import { processPRComments } from 'src/util/process-pr-comments';
import { Queue } from 'sst/node/queue';
import { PRProcessor } from '../../../processors/pull-request';
import { logProcessToRetry } from '../../../util/retry-process';

export const handler = async function pRFormattedDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info('PULL_SQS_RECIEVER_HANDLER', { messageBody });

        const pullProcessor = new PRProcessor(messageBody);
        const validatedData = pullProcessor.validate();
        if (!validatedData) {
          logger.error('pRFormattedDataReciever.error', { error: 'validation failed' });
          return;
        }
        const data = await pullProcessor.processor();
        const reviewCommentCount = await processPRComments(
          messageBody.head.repo.owner.login,
          messageBody.head.repo.name,
          messageBody.number,
          octokit
        );
        data.body.reviewComments = reviewCommentCount;
        await pullProcessor.sendDataToQueue(data, Queue.qGhPrIndex.queueUrl);
      } catch (error) {
        await logProcessToRetry(record, Queue.qGhPrFormat.queueUrl, error as Error);
        logger.error('pRFormattedDataReciever.error', error);
      }
    })
  );
};
