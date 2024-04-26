import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { LibParamsMapping } from '../../../model/lib-master-mapping';

const dynamodbClient = DynamoDbDocClient.getInstance();
export const handler = async function latestDepRegistry(event: SQSEvent): Promise<void> {
  logger.info({ message: "Records Length", data: JSON.stringify(event.Records.length) });
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const { reqCntx: { requestId, resourceId }, messageBody } = JSON.parse(record.body);
      try {
        logger.info({ message: 'LATEST_DEPENDENCIES_DYNAMODB', data:  messageBody, requestId, resourceId});
        const {
          libName,
          latest: { version, releaseDate },
        } = messageBody;
        await dynamodbClient.put(
          new LibParamsMapping().preparePutParams(libName, { version, releaseDate })
        );
        logger.info({ message: 'LATEST_DEPENDENCIES_DYNAMODB_SUCCESS', requestId, resourceId });
      } catch (error) {
        logger.error({ message: 'latestDepRegistry.error',  error, requestId, resourceId});
      }
    })
  );
};
