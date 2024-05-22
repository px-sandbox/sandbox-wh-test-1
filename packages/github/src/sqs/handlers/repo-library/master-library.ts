import { SQSClient } from '@pulse/event-handler';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import axios from 'axios';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry } from 'rp';
import { getNodeLibInfo } from '../../../util/node-library-info';

const sqsClient = SQSClient.getInstance();
export const handler = async function masterLibrary(event: SQSEvent): Promise<void> {
  logger.info({ message: 'Records Length', data: event.Records.length });
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const {
        reqCtx: { requestId, resourceId },
        message: messageBody,
      } = JSON.parse(record.body);
      try {
        logger.info({ message: 'MASTER_LIBRARY_INDEXED', data: messageBody });

        const { depName, version } = messageBody;

        const { latest } = await getNodeLibInfo(depName, version);
        const libName = `npm_${depName}`;
        if (latest.version !== version) {
          logger.info({
            message: `UpdateLatestDepHandler: ${depName} updated to ${latest.version}`,
          });
          await sqsClient.sendMessage({ latest, libName }, Queue.qLatestDepRegistry.queueUrl, {
            requestId,
            resourceId,
          });
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response && error.response.status === 404) {
            logger.info({ message: 'DEPENDENCIES_NOT_FOUND', data: record, requestId, resourceId });
            return;
          }
        }
        await logProcessToRetry(record, Queue.qMasterLibInfo.queueUrl, error as Error);
        logger.error({ message: 'masterLibrary.error', error, requestId, resourceId });
      }
    })
  );
};
