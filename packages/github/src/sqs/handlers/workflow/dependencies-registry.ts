import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { v4 as uuid } from 'uuid';
import { Github } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { mappingPrefixes } from '../../../constant/config';
import { logProcessToRetry } from '../../../util/retry-process';
import { getOrganization } from '../../../lib/get-organization';
import { getNodeLibInfo } from "../../../util/node-library-info";

export const handler = async function dependencyRegistry(event: SQSEvent): Promise<void> {
    logger.info(`Records Length: ${event.Records.length}`);
    await Promise.all(
        event.Records.map(async (record: SQSRecord) => {
            try {
                const messageBody = JSON.parse(record.body);

                logger.info('WORKFLOW_DEPENDENCIES_INDEXED', { messageBody });

                const {
                    dependencyName,
                    currentVersion,
                    ghRepoId,
                    orgName,
                    isDeleted,
                    isCore,
                } = messageBody;
                const { current, latest } = await getNodeLibInfo(dependencyName, currentVersion);
                const orgData = await getOrganization(orgName);
                const workflowObj: Github.Type.Workflow = {
                    id: uuid(),
                    body: {
                        repoId: `${mappingPrefixes.repo}_${ghRepoId}`,
                        organizationId: orgData.body.id,
                        version: currentVersion,
                        name: dependencyName,
                        libName: `npm_${dependencyName}`,
                        releaseDate: current.releaseDate,
                        isDeleted,
                        isCore,

                    }
                }
                logger.info('WORKFLOW_DEPENDENCIES_DATA', { workflowObj });
                const sqsClient = new SQSClient();
                await Promise.all([
                    sqsClient.sendMessage(workflowObj, Queue.qCurrentDepRegistry.queueUrl),
                    sqsClient.sendMessage(latest, Queue.qLatestDepRegistry.queueUrl),
                ]);
            } catch (error) {
                await logProcessToRetry(record, Queue.qDepRegistry.queueUrl, error as Error);
                logger.error('dependencyRegistry.error', { error });
            }
        })
    );
};
