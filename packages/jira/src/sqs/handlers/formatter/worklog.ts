import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import _ from 'lodash';
import { logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';
import { WorklogProcessor } from 'src/processors/worklog';

export const handler = async function worklogFormattedDataReciever(event: SQSEvent): Promise<void> {
    logger.info({ message: `Records Length: ${event.Records.length}` });
  
    await Promise.all(
      event.Records.map(async (record: SQSRecord) => {
        const {
          reqCtx: { requestId, resourceId },
          message: messageBody,
        } = JSON.parse(record.body);
        try {
          logger.info({
            requestId,
            resourceId,
            message: 'WORKLOG_SQS_RECIEVER_HANDLER',
            data: { messageBody },
          });
          const worklogProcessor = new WorklogProcessor(messageBody, requestId, resourceId);
          await worklogProcessor.process(); 
          await worklogProcessor.save();
        } catch (error) {
          await logProcessToRetry(record, Queue.qWorklogFormat.queueUrl, error as Error);
          logger.error({
            requestId,
            resourceId,
            message: 'worklogFormattedDataReciever.error',
            error,
          });
        }
      })
    );
  };
  