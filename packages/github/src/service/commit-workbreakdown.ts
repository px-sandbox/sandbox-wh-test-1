import { SQSClient } from "@pulse/event-handler";
import { Queue } from "sst/node/queue";
import { Github } from 'abstraction';
import { logger, responseParser, HttpStatusCode } from "core";

const sqsClient = SQSClient.getInstance();

export const handler = async (event: { body: string, requestId: string }) => {
  try {
    const commits: Github.ExternalType.Webhook.CommitWorkBreakdown[] = JSON.parse(event.body);

    logger.info({message: "handler.invoked", data: {commits}, requestId: event.requestId});

    // Log each commit's workbreakdown
    await Promise.all(commits.map(async(commit) => {
      await sqsClient.sendMessage(
        commit,
        Queue.qGhWorkbreakdown.queueUrl,
        {
          requestId: commit.commitId,
          resourceId: commit.commitId,
        }
      );
    }));

    logger.info({message: "handler.completed", data: {commits}, requestId: event.requestId});
    return responseParser
      .setBody({ message: 'Workbreakdown data queued for processing' })
      .setMessage('Commit Workbreakdown')
      .setStatusCode(HttpStatusCode[200])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (error) {
    logger.error({message: "handler.error", error, requestId: event.requestId});
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process workbreakdown data' }),
    };
  }
}; 