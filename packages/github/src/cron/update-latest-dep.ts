import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ScanCommandInput, ScanCommandOutput } from '@aws-sdk/lib-dynamodb';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { LibParamsMapping } from '../model/lib-master-mapping';

async function sendAllDepsToQueue(items: Array<{ libName: string; version: string }>): Promise<void> {
    try {
        await Promise.all(
            items.map(async (item) => {
                const { libName, version } = item;
                const depName = libName.split('npm_')[1];
                new SQSClient().sendMessage({ depName, version }, Queue.qMasterLibInfo.queueUrl);
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
            data = await new DynamoDbDocClient().scanAllItems(params);
            items = data.Items ? data.Items as { libName: string; version: string }[] : [];
            params.ExclusiveStartKey = data.LastEvaluatedKey;
            if (items.length > 0) {
                // eslint-disable-next-line no-await-in-loop
                await sendAllDepsToQueue(items);
            }
        } while (data.LastEvaluatedKey);

    } catch (err) {
        logger.error('cronUpdateLatestDep.handler.Error:', JSON.stringify(err, null, 2));
        throw err;
    }
}
