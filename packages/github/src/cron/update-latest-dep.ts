import { DynamoDbDocClient } from '@pulse/dynamodb';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { LibParamsMapping } from '../model/lib-master-mapping';
import { getNodeLibInfo } from "../util/node-library-info";

async function getAllDepsList(): Promise<Array<unknown>> {
    try {
        const items = await new DynamoDbDocClient().scanAllItems(new LibParamsMapping().prepareScanParams());
        return items;
    } catch (err) {
        logger.error('Unable to scan the table. Error JSON:', JSON.stringify(err, null, 2));
        throw err;
    }
}

export async function handler(): Promise<void> {
    logger.info(`UpdateLatestDepHandler invoked at: ${new Date().toISOString()}`);

    const deps = await getAllDepsList();
    await Promise.all(
        deps.map(async (dep) => {
            const { libName, version } = dep as { libName: string, version: string };
            const depName = libName.split('npm_')[1];
            const { latest } = await getNodeLibInfo(depName, version);
            if (latest.version !== version) {
                logger.info(`UpdateLatestDepHandler: ${libName} updated to ${latest.version}`);
                new SQSClient().sendMessage({ latest, libName }, Queue.qLatestDepRegistry.queueUrl)
            }

        })
    );
}