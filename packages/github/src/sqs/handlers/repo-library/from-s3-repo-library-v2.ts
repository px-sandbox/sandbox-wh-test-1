import { Github } from 'abstraction';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry } from 'rp';
import { fetchDataFromS3 } from '../../../processors/repo-sast-errors';
import { repoLibHelper } from '../../../service/repo-library/repo-library-helper';

export const handler = async function repoLibS3(event: SQSEvent): Promise<void> {
  logger.info({ message: 'Records Length', data: JSON.stringify(event.Records.length) });
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const {
        reqCtx: { requestId, resourceId },
        message: messageBody,
      } = JSON.parse(record.body);
      try {
        const data =  // TODO: Implement the logic to fetch the artifact

        if (data) {
          await repoLibHelper(
            { ...data, processId: messageBody.processId },
            { requestId, resourceId }
          );
        } else {
          logger.error({
            message: 'repoLibS3DataReceiver.nodata',
            error: 'No data received from s3 for repo library',
            requestId,
            resourceId,
          });
        }
      } catch (error) {
        await logProcessToRetry(record, Queue.qRepoLibS3.queueUrl, error as Error);

        logger.error({
          message: 'repoLibS3DataReceiver.error',
          error,
          requestId,
          resourceId,
        });
      }
    })
  );
};
