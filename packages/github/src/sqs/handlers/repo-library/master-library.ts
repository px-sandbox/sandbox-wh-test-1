import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { SQSClient } from '@pulse/event-handler';
import { logProcessToRetry } from '../../../util/retry-process';
import { getNodeLibInfo } from "../../../util/node-library-info";

export const handler = async function masterLibrary(event: SQSEvent): Promise<void> {
    logger.info(`Records Length: ${event.Records.length}`);
    await Promise.all(
        event.Records.map(async (record: SQSRecord) => {
            try {
                const messageBody = JSON.parse(record.body);

                logger.info('MASTER_LIBRARY_INDEXED', { messageBody });

                const {
                    depName,
                    version,
                } = messageBody;

                const { latest } = await getNodeLibInfo(depName, version);
                const libName = `npm_${depName}`;
                if (latest.version !== version) {
                    logger.info(`UpdateLatestDepHandler: ${depName} updated to ${latest.version}`);
                    await new SQSClient().sendMessage({ latest, libName }, Queue.qLatestDepRegistry.queueUrl);
                }

            } catch (error) {
                await logProcessToRetry(record, Queue.qMasterLibInfo.queueUrl, error as Error);
                logger.error('masterLibrary.error', { error });
            }
        })
    );
};
