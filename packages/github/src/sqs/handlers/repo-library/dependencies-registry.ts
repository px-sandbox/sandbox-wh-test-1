import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import axios from 'axios';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';
import { v4 as uuid } from 'uuid';
import { logProcessToRetry } from 'rp';
import { mappingPrefixes } from '../../../constant/config';
import { getNodeLibInfo } from '../../../util/node-library-info';

export const handler = async function dependencyRegistry(event: SQSEvent): Promise<void> {
  logger.info({ message: `Records Length: ${event.Records.length}` });
  const sqsClient = SQSClient.getInstance();
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const {
        reqCtx: { requestId, resourceId },
        message: messageBody,
      } = JSON.parse(record.body);
      try {
        logger.info({ message: 'DEPENDENCIES_INDEXED', data: messageBody, requestId, resourceId });

        const { dependencyName, currentVersion, repoId, isDeleted, isCore } = messageBody;

        const { current, latest } = await getNodeLibInfo(dependencyName, currentVersion);
        const libName = `npm_${dependencyName}`;
        const repoLibObj: Github.Type.RepoLibrary = {
          id: uuid(),
          body: {
            repoId: `${mappingPrefixes.repo}_${repoId}`,
            organizationId: `${mappingPrefixes.organization}_${Config.GIT_ORGANIZATION_ID}`,
            version: currentVersion,
            name: dependencyName,
            libName,
            releaseDate: current.releaseDate,
            isDeleted,
            isCore,
          },
        };
        logger.info({ message: 'DEPENDENCIES_DATA', data: repoLibObj, requestId, resourceId });
        await Promise.all([
          sqsClient.sendMessage(repoLibObj, Queue.qCurrentDepRegistry.queueUrl, {
            requestId,
            resourceId,
          }),
          sqsClient.sendMessage({ latest, libName }, Queue.qLatestDepRegistry.queueUrl, {
            requestId,
            resourceId,
          }),
        ]);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response && error.response.status === 404) {
            logger.info({ message: 'DEPENDENCIES_NOT_FOUND', data: record, requestId, resourceId });
            return;
          }
        }
        await logProcessToRetry(record, Queue.qDepRegistry.queueUrl, error as Error);
        logger.error({
          message: 'dependencyRegistry.error',
          error: `${error}`,
          requestId,
          resourceId,
        });
      }
    })
  );
};
