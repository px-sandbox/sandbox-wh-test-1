import { Github } from 'abstraction';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry } from 'rp';
import { fetchArtifacts } from '../../../util/fetch-artifacts';
import { repoLibHelper } from '../../../service/repo-library/repo-library-helper';

export const handler = async function repoLibS3V2(event: SQSEvent | any): Promise<void> {
  // Format event if it's not in SQS format
  if (!event.Records) {
    event = {
      Records: [{
        body: JSON.stringify({
          message: event,
          reqCtx: {
            requestId: event.organisationId,
            resourceId: event.repoId
          }
        })
      }]
    };
  }
  
  if (!event || !event.Records || !Array.isArray(event.Records)) {
    logger.error({ message: 'Invalid event format received 1', data: { event } });
    return;
  }

  logger.info({ message: 'Records Length', data: event.Records.length });
  
  try {
    await Promise.all(
      event.Records.map(async (record: SQSRecord) => {
        if (!record || !record.body) {
          logger.error({ message: 'Invalid record format', data: { record } });
          return;
        }

        let requestId, resourceId, messageBody;
        try {
          const parsedBody = JSON.parse(record.body);
          requestId = parsedBody.reqCtx?.requestId;
          resourceId = parsedBody.reqCtx?.resourceId;
          messageBody = parsedBody.message;
        } catch (parseError) {
          logger.error({ 
            message: 'Failed to parse record body', 
            error: parseError,
            data: { body: record.body }
          });
          return;
        }
        try {
          if (!messageBody.orgName || !messageBody.artifactDownloadUrl) {
            logger.error({
              message: 'Missing required fields in message body',
              data: { messageBody },
              requestId,
              resourceId,
            });
            return;
          }
          const data: Github.ExternalType.RepoLibrary = await fetchArtifacts(
            messageBody.orgName,
            messageBody.artifactDownloadUrl
          );
          
          if (data) {
            
            await repoLibHelper(
              { ...data, processId: messageBody.processId },
              { requestId, resourceId }
            );
          } else {
            
            logger.error({
              message: 'repoLibS3DataReceiver.nodata',
              error: 'No data received from artifacts for repo library',
              requestId,
              resourceId,
            });
          }
        } catch (error) {
          await logProcessToRetry(record, Queue.qRepoLibS3V2.queueUrl, error as Error);

          logger.error({
            message: 'repoLibS3DataReceiver.error',
            error,
            requestId,
            resourceId,
          });
        }
      })
    );
  } catch (error) {
    
    logger.error({
      message: 'Failed to process SQS event',
      error,
      data: { event }
    });
  }
};
