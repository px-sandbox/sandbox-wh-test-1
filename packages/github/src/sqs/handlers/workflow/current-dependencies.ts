import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { v4 as uuid } from 'uuid';
import { Github } from 'abstraction';
import { mappingPrefixes } from '../../../constant/config';
import { saveWorkflowDetails } from '../../../lib/save-workflow';
import { logProcessToRetry } from '../../../util/retry-process';
import { getOrganization } from '../../../lib/get-organization';

export const handler = async function currentDepRegistry(event: SQSEvent): Promise<void> {
    logger.info(`Records Length: ${event.Records.length}`);
    await Promise.all(
        event.Records.map(async (record: SQSRecord) => {
            try {
                const messageBody = JSON.parse(record.body);

                logger.info('WORKFLOW_CURRENT_DEPENDENCIES_INDEXED', { messageBody });

                const {
                    version,
                    owner,
                    repo_name: repoName,
                    package: packageName,
                    ghRepoId,
                    orgName,
                    isDeleted,
                    isCore
                } = messageBody;
                const currentDep = await getCurrentDepReleaseDate(repoName, owner);

                const orgData = await getOrganization(orgName);
                const workflowObj: Github.Type.Workflow = {
                    id: uuid(),
                    body: {
                        repoId: `${mappingPrefixes.repo}_${ghRepoId}`,
                        organizationId: orgData.body.id,
                        version,
                        name: packageName,
                        libName: `npm_${packageName}`,
                        releaseDate: currentDep.releaseDate,
                        isDeleted,
                        isCore,

                    }
                }
                await saveWorkflowDetails(workflowObj);
            } catch (error) {
                await logProcessToRetry(record, Queue.qCurrentDepRegistry.queueUrl, error as Error);
                logger.error('currentDepRegistry.error', { error });
            }
        })
    );
};
