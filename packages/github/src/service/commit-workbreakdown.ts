import { SQSClient } from "@pulse/event-handler";
import { Queue } from "sst/node/queue";
import { Github } from 'abstraction';
import { logger } from "core";

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
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Workbreakdown data queued for processing' }),
    };
  } catch (error) {
    console.error('Error processing workbreakdown data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process workbreakdown data' }),
    };
  }
}; 