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
            const { repository_info: { repo_id: ghRepoId, repo_owner: orgName }, dependencies } = data;
            const promises = [];

            for (const [pkg, dependency] of Object.entries(dependencies)) {
                const message = {
                    ...dependency,
                    package: pkg,
                    ghRepoId,
                    orgName,
                    isDeleted: false,
                    isCore: false,
                };
                promises.push(sqsClient.sendMessage(message, Queue.qCurrentDepRegistry.queueUrl));
            }
            await Promise.all(promises);
        } else {
            logger.warn('workflow.handler.noData');
        }

    }
    catch (error) {
        logger.error('workflow.handler.error', { error, event });
    }
}
