import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { v4 as uuid } from 'uuid';
import { Github } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Config } from 'sst/node/config';
import { mappingPrefixes } from '../../../constant/config';
import { logProcessToRetry } from '../../../util/retry-process';
import { getNodeLibInfo } from "../../../util/node-library-info";

export const handler = async function dependencyRegistry(event: SQSEvent): Promise<void> {
    logger.info(`Records Length: ${event.Records.length}`);
    await Promise.all(
        event.Records.map(async (record: SQSRecord) => {
            try {
                const messageBody = JSON.parse(record.body);

                logger.info('DEPENDENCIES_INDEXED', { messageBody });

                const {
                    dependencyName,
                    currentVersion,
                    repoId,
                    isDeleted,
                    isCore,
                } = messageBody;

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

                    }
                }
                logger.info('DEPENDENCIES_DATA', { repoLibObj });
                const sqsClient = new SQSClient();
                await Promise.all([
                    sqsClient.sendMessage(repoLibObj, Queue.qCurrentDepRegistry.queueUrl),
                    sqsClient.sendMessage({ latest, libName }, Queue.qLatestDepRegistry.queueUrl),
                ]);
            } catch (error) {
                await logProcessToRetry(record, Queue.qDepRegistry.queueUrl, error as Error);
                logger.error('dependencyRegistry.error', { error });
            }
        })
    );
};
