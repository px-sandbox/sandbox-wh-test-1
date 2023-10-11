import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { Jira } from 'abstraction';
import { Queue } from 'sst/node/queue';

export const handler = async function userMigration(event: SQSEvent): Promise<void> {
  try {
    const sqsClient = new SQSClient();
    await Promise.all(
      event.Records.map((record: SQSRecord) => {

        const { organization, user }: { organization: string; user: Jira.ExternalType.Api.User } =
          JSON.parse(record.body);
        const createdAt = new Date().toISOString();
        const deletedAt = null;
        return sqsClient.sendMessage(
          {
            ...user,
            isDeleted: !!deletedAt,
            deletedAt,
            createdAt,
            organization,
          },
          Queue.jira_user_format.queueUrl
        );

      })
    );
  } catch (error) {
    logger.error(JSON.stringify({ error, event }));
  }
};
