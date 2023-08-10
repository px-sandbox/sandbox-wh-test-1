import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { BranchProcessor } from 'src/processors/branch';
import { Queue } from 'sst/node/queue';

export const handler = async function branchFormattedDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: any) => {
      try {
        const messageBody = JSON.parse(record.body);
        // Do something with the message, e.g. send an email, process data, etc.
        /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
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
