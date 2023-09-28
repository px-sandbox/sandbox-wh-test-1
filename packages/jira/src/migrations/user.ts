import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { Jira } from 'abstraction';
import { Queue } from 'sst/node/queue';

export const handler = async function (event: SQSEvent) {
  const sqsClient = new SQSClient();
  await Promise.all(
    event.Records.map((record: SQSRecord) => {
      try {
        const { organisation, user }: { organisation: string; user: Jira.ExternalType.Api.User } =
          JSON.parse(record.body);

        return sqsClient.sendMessage(
          {
            organisation,
            user,
          },
          Queue.jira_user_format.queueUrl
        );
      } catch (error) {
        logger.error(JSON.stringify({ error, record }));
      }
    })
  );
};
