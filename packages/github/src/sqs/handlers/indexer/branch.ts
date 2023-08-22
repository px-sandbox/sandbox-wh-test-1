import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { saveBranchDetails } from '../../../lib/save-branch';

export const handler = async function branchIndexDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: any) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info('BRANCH_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

        await saveBranchDetails(messageBody);
      } catch (error) {
        logger.error('branchIndexDataReciever.error', { error });
      }
    })
  );
};
