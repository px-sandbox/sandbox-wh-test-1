import { ElasticSearchClient } from "@pulse/elasticsearch";
import { SQSClient } from "@pulse/event-handler";
import { Github } from "abstraction";
import { logger } from "core";
import esb from "elastic-builder";
import { Config } from "sst/node/config";
import { Queue } from "sst/node/queue";
import { mappingPrefixes } from "../../constant/config";

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
export async function repoLibHelper(data: Github.ExternalType.RepoLibrary): Promise<void> {
    logger.info('repoLibrary.handler', { data });

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
    }
}