import { SQSClient, SQSClientGh } from '@pulse/event-handler';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import axios from 'axios';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { getNodeLibInfo } from '../../../util/node-library-info';
import { logProcessToRetry } from '../../../util/retry-process';

const sqsClient = SQSClientGh.getInstance();
export const handler = async function masterLibrary(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);

        logger.info('MASTER_LIBRARY_INDEXED', { messageBody });

        const { depName, version } = messageBody;

        const { latest } = await getNodeLibInfo(depName, version);
        const libName = `npm_${depName}`;
        if (latest.version !== version) {
          logger.info(`UpdateLatestDepHandler: ${depName} updated to ${latest.version}`);
          await sqsClient.sendMessage({ latest, libName }, Queue.qLatestDepRegistry.queueUrl);
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response && error.response.status === 404) {
            logger.info('DEPENDENCIES_NOT_FOUND', { record });
            return;
          }
        }
        await logProcessToRetry(record, Queue.qMasterLibInfo.queueUrl, error as Error);
        logger.error(`masterLibrary.error', ${error}`);
      }
    })
  );
};
