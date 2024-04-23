import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { RetryTableMapping } from 'src/model/retry-table-mapping';
import { Github } from '../../../abstraction';
import { logger } from '../../../core';

const sqsClient = SQSClient.getInstance();
const dynamodbClient = DynamoDbDocClient.getInstance();

async function processIt(record: Github.Type.QueueMessage): Promise<void> {
    const { processId, messageBody, queue, MessageDeduplicationId, MessageGroupId } = record;
    try {
        await sqsClient
            .sendMessage(
                { ...JSON.parse(messageBody), processId },
                queue,
                MessageGroupId,
                MessageDeduplicationId
            )
            .then(async () => {
                logger.info('RetryProcessHandlerProcess.success', { processId, queue });
            })
            .catch((error) => {
                logger.error('RetryProcessHandlerProcess.error', error);
            });
    } catch (error) {
        logger.error('RetryProcessHandlerProcess.error', error);
    }
}

export async function handler(): Promise<void> {
    logger.info(`RetryProcessHandler invoked at: ${new Date().toISOString()}`);
    const limit = 500;
    const params = new RetryTableMapping().prepareScanParams(limit);
    // eslint-disable-next-line no-plusplus
    // eslint-disable-next-line no-await-in-loop
    const processes = await dynamodbClient.scan(params);
    if (processes.Count === 0) {
        logger.info(`RetryProcessHandler no processes found at: ${new Date().toISOString()}`);
        return;
    }

    //a filter to only retry the process that has not been retried more than 3 times
    const items = processes.Items
        ? (processes.Items.filter((item) => item.messageBody.retry <= 3) as Github.Type.QueueMessage[])
        : [];
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(items.map((record: unknown) => processIt(record as Github.Type.QueueMessage)));
    logger.info(`RetryProcessHandler lastEvaluatedKey: ${processes.LastEvaluatedKey}`);
    params.ExclusiveStartKey = processes.LastEvaluatedKey;
}
