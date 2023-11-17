import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { LibParamsMapping } from '../../../model/lib-master-mapping';

export const handler = async function latestDepRegistry(event: SQSEvent): Promise<void> {
    logger.info(`Records Length: ${event.Records.length}`);
    await Promise.all(
        event.Records.map(async (record: SQSRecord) => {
            try {
                const messageBody = JSON.parse(record.body);
                logger.info('WORKFLOW_LATEST_DEPENDENCIES_DYNAMODB', { messageBody });
                const {
                    libName,
                    latest: { version, releaseDate },
                } = messageBody;
                await new DynamoDbDocClient().put(
                    new LibParamsMapping().preparePutParams(libName, { version, releaseDate })
                );
            } catch (error) {
                logger.error('latestDepRegistry.error', { error });
            }
        })
    );
};
