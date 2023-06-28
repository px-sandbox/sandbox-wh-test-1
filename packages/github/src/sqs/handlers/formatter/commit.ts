import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { CommitProcessor } from 'src/processors/commit';
import { Queue } from 'sst/node/queue';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { ghRequest } from 'src/lib/request-defaults';

export const handler = async function commitFormattedDataReciever(
  event: APIGatewayProxyEvent
): Promise<void> {
  for (const record of event.Records) {
    const messageBody = JSON.parse(record.body);
    // Do something with the message, e.g. send an email, process data, etc.
    /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
    logger.info('COMMIT_SQS_RECIEVER_HANDLER_FORMATER', { messageBody });
    const {
      commitId,
      repository: { id: repoId, name: repoName, owner: repoOwner },
    } = messageBody;
    /**
     * ------------------------------------
     * Get commit details from Github API
     * ------------------------------------
     */

    const installationAccessToken = await getInstallationAccessToken();
    const octokit = ghRequest.request.defaults({
      headers: {
        Authorization: `Bearer ${installationAccessToken.body.token}`,
      },
    });

    const responseData = await octokit(`GET /repos/${repoOwner}/${repoName}/commits/${commitId}`);
    const commitProcessor = new CommitProcessor({
      ...responseData.data,
      commits: { id: commitId },
      repoId: repoId,
    });
    const validatedData = commitProcessor.validate();
    if (!validatedData) {
      logger.error('commitFormattedDataReciever.error', { error: 'validation failed' });
      return;
    }
    const data = await commitProcessor.processor();
    await commitProcessor.sendDataToQueue(data, Queue.gh_commit_index.queueUrl);
  }
};
