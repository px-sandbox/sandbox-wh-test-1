import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { RepositoryProcessor } from '../../../processors/repo';

export const handler = async function repoFormattedDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: any) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info('REPO_SQS_RECIEVER_HANDLER', { messageBody });

        const repoProcessor = new RepositoryProcessor(messageBody);
        const validatedData = repoProcessor.validate();
        if (!validatedData) {
          logger.error('repoFormattedDataReciever.error', { error: 'validation failed' });
          return;
        }
        const data = await repoProcessor.processor();
        await repoProcessor.sendDataToQueue(data, Queue.gh_repo_index.queueUrl);
      } catch (error) {
        logger.error('repoFormattedDataReciever.error', error);
      }
    })
  );
};
