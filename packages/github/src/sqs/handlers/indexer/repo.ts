import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { saveRepoDetails } from '../../../lib/save-repo';

export const handler = async function repoIndexDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: { body: string }) => {
      try {
        const messageBody = JSON.parse(record.body);

        logger.info('REPO_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });
        await saveRepoDetails(messageBody);
      } catch (error) {
        logger.error('repoIndexDataReciever.error', { error });
      }
    })
  );
};
