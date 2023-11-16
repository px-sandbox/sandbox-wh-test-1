import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "core";
import { Github } from "abstraction";
import { SQSClient } from "@pulse/event-handler";
import { Queue } from "sst/node/queue";
import { getNodeLibInfo } from "../../util/node-library-info";

export const handler = async (event: APIGatewayProxyEvent): Promise<void | APIGatewayProxyResult> => {
    try {
        logger.info('workflow.handler.invoked', { event });
        const data: Github.ExternalType.Workflow = JSON.parse(event.body ?? '{}');
        logger.info('workflow.handler.received', { data });

        if (data) {
            const sqsClient = new SQSClient();
            const {
                coreDependencies,
                repository_info: {
                    repo_id: ghRepoId,
                    repo_owner: orgName
                },
                dependencies
            } = data;
            const coreDeps = Object.entries(coreDependencies).map(
                ([dependencyName, currentVersion]) => ({ dependencyName, currentVersion })
            );
            const allDeps = [...coreDeps, ...dependencies];
            const uniqueDeps = allDeps.filter((dep, index, self) =>
                index === self.findIndex((t) => (
                    t.dependencyName === dep.dependencyName && t.currentVersion === dep.currentVersion
                ))
            );

            await Promise.all(uniqueDeps.map(async (dep) => {
                const { current } = await getNodeLibInfo(dep.dependencyName, dep.currentVersion);
                const message = {
                    ...dep,
                    ghRepoId,
                    orgName,
                    isDeleted: false,
                    isCore: coreDeps.some((coreDep) => coreDep.dependencyName === dep.dependencyName),
                    releaseDate: current.releaseDate,
                };
                sqsClient.sendMessage(message, Queue.qCurrentDepRegistry.queueUrl);
            }
            ));
        } else {
            logger.warn('workflow.handler.noData');
        }

    }
    catch (error) {
        logger.error('workflow.handler.error', { error, event });
    }
}
