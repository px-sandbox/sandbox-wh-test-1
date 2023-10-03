import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { saveIssueDetails } from 'src/repository/save-issue';

export const handler = async function issueIndexDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);

        logger.info('ISSUE_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

        await saveIssueDetails(messageBody);
      } catch (error) {
        logger.error('issueIndexDataReciever.error', { error });
      }
    })
  );
};
