import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { logger } from 'core';
import { Github } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import esb from 'elastic-builder';
import { mappingPrefixes } from '../../constant/config';
import { searchedDataFormator } from '../../util/response-formatter';

async function deletePrevDependencies(repoId: string): Promise<void> {
    const esClientObj = new ElasticSearchClient({
        host: Config.OPENSEARCH_NODE,
        username: Config.OPENSEARCH_USERNAME ?? '',
        password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry = esb.matchQuery('body.repoId', `${mappingPrefixes.repo}_${repoId}`).toJSON();
    const workflowData = await esClientObj.searchWithEsb(
        Github.Enums.IndexName.GitWorkflow,
        matchQry
    );
    const formattedData = await searchedDataFormator(workflowData);
    if (formattedData) {
        formattedData.map(async (data: { _id: string }) => {
            const updatedData = { body: { isDeleted: true } };
            await esClientObj.updateDocument(Github.Enums.IndexName.GitWorkflow, data._id, updatedData);
        });
    }
}
export const handler = async (
    event: APIGatewayProxyEvent
): Promise<void | APIGatewayProxyResult> => {
    try {
        const data: Github.ExternalType.Workflow = JSON.parse(event.body ?? '{}');
        logger.info('workflow.handler.received', { data });

        if (data) {
            const sqsClient = new SQSClient();
            const {
                coreDependencies,
                repositoryInfo: { repoId, repoOwner: orgName },
                dependencies,
            } = data;

            const allDeps = [...coreDependencies, ...dependencies];
            const uniqueDeps = allDeps.filter(
                (dep, index, self) =>
                    index ===
                    self.findIndex(
                        (t) =>
                            t.dependencyName === dep.dependencyName && t.currentVersion === dep.currentVersion
                    )
            );
            await deletePrevDependencies(repoId);

            await Promise.all(
                uniqueDeps.map(async (dep) => {
                    const message = {
                        ...dep,
                        repoId,
                        orgName,
                        isDeleted: false,
                        isCore: coreDependencies.some(
                            (coreDep) => coreDep.dependencyName === dep.dependencyName
                        ),
                    };
                    sqsClient.sendMessage(message, Queue.qDepRegistry.queueUrl);
                })
            );
        } else {
            logger.warn('workflow.handler.noData');
        }
    } catch (error) {
        logger.error('workflow.handler.error', { error, event });
    }
};
