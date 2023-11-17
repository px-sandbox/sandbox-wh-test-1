import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "core";
import { Github } from "abstraction";
import { SQSClient } from "@pulse/event-handler";
import { Queue } from "sst/node/queue";

export const handler = async (event: APIGatewayProxyEvent): Promise<void | APIGatewayProxyResult> => {
    try {
        logger.info('workflow.handler.invoked', { event });
        const data: Github.ExternalType.Workflow = JSON.parse(event.body ?? '{}');
        logger.info('workflow.handler.received', { data });

        if (data) {
            const sqsClient = new SQSClient();
            const {
                coreDependencies,
                repositoryInfo: {
                    repoId,
                    repoOwner: orgName
                },
                dependencies
            } = data;

            const allDeps = [...coreDependencies, ...dependencies];
            const uniqueDeps = allDeps.filter((dep, index, self) =>
                index === self.findIndex((t) => (
                    t.dependencyName === dep.dependencyName && t.currentVersion === dep.currentVersion
                ))
            );
            logger.info('workflow.handler.uniqueDeps', { uniqueDeps });
            await Promise.all(uniqueDeps.map(async (dep) => {
                const message = {
                    ...dep,
                    repoId,
                    orgName,
                    isDeleted: false,
                    isCore: coreDependencies.some((coreDep) => coreDep.dependencyName === dep.dependencyName),
                };
                logger.info('workflow.handler.sqsMessage', message);
                sqsClient.sendMessage(message, Queue.qDepRegistry.queueUrl);
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
