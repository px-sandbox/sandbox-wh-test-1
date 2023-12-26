import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { logger } from 'core';
import { Github } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import esb from 'elastic-builder';
import { mappingPrefixes } from '../../constant/config';

async function deletePrevDependencies(repoId: string): Promise<void> {
    const esClientObj = new ElasticSearchClient({
        host: Config.OPENSEARCH_NODE,
        username: Config.OPENSEARCH_USERNAME ?? '',
        password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry = esb.matchQuery('body.repoId', `${mappingPrefixes.repo}_${repoId}`).toJSON();
    const script = esb.script('inline', 'ctx._source.body.isDeleted = true');

    await esClientObj.updateByQuery(
        Github.Enums.IndexName.GitRepoLibrary,
        matchQry,
        script.toJSON()
    );
}
export const handler = async (
    event: APIGatewayProxyEvent
): Promise<void | APIGatewayProxyResult> => {
    try {
        const data: Github.ExternalType.RepoLibrary = JSON.parse(event.body ?? '{}');
        logger.info('repoLibrary.handler.received', { data });

        if (data) {
            const sqsClient = new SQSClient();
            const {
                coreDependencies,
                repositoryInfo: { repoId, repoOwner: orgName },
                dependencies,
            } = data;

            const uniqueDeps = dependencies.filter(
                (dep, index, self) =>
                    index ===
                    self.findIndex(
                        (t) =>
                            t.dependencyName === dep.dependencyName && t.currentVersion === dep.currentVersion
                    )
            );
            await deletePrevDependencies(repoId);

            await Promise.all(
                [...uniqueDeps.map(async (dep) => {
                    const message = {
                        ...dep,
                        repoId,
                        orgName,
                        isDeleted: false,
                        isCore: false
                    };

                    await sqsClient.sendMessage(message, Queue.qDepRegistry.queueUrl);
                }), ...coreDependencies.map(async (dep) => {
                    const message = {
                        ...dep,
                        repoId,
                        orgName,
                        isDeleted: false,
                        isCore: true
                    };

                    await sqsClient.sendMessage(message, Queue.qDepRegistry.queueUrl);
                })]

            );
        } else {
            logger.warn('repoLibrary.handler.noData');
        }
    } catch (error) {
        logger.error('repoLibrary.handler.error', { error, event });
    }
};
