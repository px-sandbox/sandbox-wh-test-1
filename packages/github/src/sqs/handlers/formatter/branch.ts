import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { BranchProcessor } from '../../../processors/branch';

export const handler = async function branchFormattedDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info('BRANCH_SQS_RECIEVER_HANDLER', { messageBody });
        const branchProcessor = new BranchProcessor(messageBody);
        const validatedData = branchProcessor.validate();
        if (!validatedData) {
          logger.error('branchFormattedDataReciever.error', { error: 'validation error' });
          return;
        }
        const data = await branchProcessor.processor();
        await branchProcessor.sendDataToQueue(data, Queue.gh_branch_index.queueUrl);
      } catch (error) {
        logger.error('branchFormattedDataReciever.error', error);
      }
    })
  );
};
