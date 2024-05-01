import { ScanCommandInput, ScanCommandOutput } from '@aws-sdk/lib-dynamodb';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { LibParamsMapping } from '../model/lib-master-mapping';

const dynamodbClient = DynamoDbDocClient.getInstance();
const sqsClient = SQSClient.getInstance();
async function sendAllDepsToQueue(
  items: Array<{ libName: string; version: string }>
): Promise<void> {
  try {
    await Promise.all(
      items.map(async (item) => {
        const { libName, version } = item;
        const depName = libName.split('npm_')[1];
        logger.info(`sendAllDepsToQueue: libname: ${depName}, version: ${version}`);
        return sqsClient.sendMessage({ depName, version }, Queue.qMasterLibInfo.queueUrl);
      })
    );
  } catch (err) {
    logger.error('sendAllDepsToQueue.Error', JSON.stringify(err, null, 2));
    throw err;
  }
}

export async function handler(): Promise<void> {
  logger.info(`UpdateLatestDepHandler invoked at: ${new Date().toISOString()}`);

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
        logger.info(`UpdateLatestDepHandler: ${items.length} items found`);
        // eslint-disable-next-line no-await-in-loop
        await sendAllDepsToQueue(items);
      }
    } while (data.LastEvaluatedKey);
  } catch (err) {
    logger.error('cronUpdateLatestDep.handler.Error:', JSON.stringify(err, null, 2));
    throw err;
  }
}
