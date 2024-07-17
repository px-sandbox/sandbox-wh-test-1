import { ScanCommandInput, ScanCommandOutput } from '@aws-sdk/lib-dynamodb';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { LibParamsMapping } from '../model/lib-master-mapping';
import { v4 as uuid } from 'uuid';

const dynamodbClient = DynamoDbDocClient.getInstance();
const sqsClient = SQSClient.getInstance();
async function sendAllDepsToQueue(
  items: Array<{ libName: string; version: string }>,
  requestId: string
): Promise<void> {
  try {
    await Promise.all(
      items.map(async (item) => {
        const { libName, version } = item;
        const depName = libName.split('npm_')[1];
        logger.info({
          message: 'sendAllDepsToQueue: libname',
          data: { depName, version },
          requestId,
        });
        return sqsClient.sendMessage({ depName, version }, Queue.qMasterLibInfo.queueUrl, {
          requestId,
        });
      })
    );
  } catch (err) {
    logger.error({
      message: 'sendAllDepsToQueue.Error',
      error: JSON.stringify(err, null, 2),
      requestId,
    });
    throw err;
  }
}

export async function handler(event: APIGatewayProxyEvent): Promise<void> {
  const requestId = uuid();
  logger.info({
    message: 'UpdateLatestDepHandler invoked',
    data: new Date().toISOString(),
    requestId,
  });

  try {
    let items: { libName: string; version: string }[] = [];
    let data: ScanCommandOutput;
    const params: ScanCommandInput = new LibParamsMapping().prepareScanParams();
    do {
      // eslint-disable-next-line no-await-in-loop
      data = await dynamodbClient.scanAllItems(params);
      items = data.Items ? (data.Items as { libName: string; version: string }[]) : [];
      params.ExclusiveStartKey = data.LastEvaluatedKey;
      if (items.length > 0) {
        logger.info({
          message: 'UpdateLatestDepHandler',
          data: { length: items.length },
          requestId,
        });
        // eslint-disable-next-line no-await-in-loop
        await sendAllDepsToQueue(items, requestId);
      }
    } while (data.LastEvaluatedKey);
  } catch (err) {
    logger.error({
      message: 'cronUpdateLatestDep.handler.Error:',
      error: JSON.stringify(err, null, 2),
      requestId,
    });
    throw err;
  }
}
