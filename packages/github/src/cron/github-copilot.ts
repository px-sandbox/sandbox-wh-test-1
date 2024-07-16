import { RequestInterface } from '@octokit/types';
import { Queue } from 'sst/node/queue';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { getOctokitTimeoutReqFn } from '../util/octokit-timeout-fn';
import { ghRequest } from '../lib/request-default';
import { getInstallationAccessToken } from '../util/installation-access-token';
import { v4 as uuid } from 'uuid';

const sqsClient = SQSClient.getInstance();
export async function initializeOctokit(): Promise<
  RequestInterface<
    object & {
      headers: {
        Authorization: string | undefined;
      };
    }
  >
> {
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);
  return octokitRequestWithTimeout;
}
async function getGHCopilotReports(
  octokit: RequestInterface<
    object & {
      headers: {
        Authorization: string | undefined;
      };
    }
  >,
  requestId: string,
  pageNo = 1,
  counter = 0
): Promise<number> {
  try {
    logger.info({
      message: 'getGHCopilotReports.info: Github Copilot invoked at',
      data: new Date().toISOString(),
    });
    const perPage = 100; // max allowed by github
    const org = Github.Enums.OrgConst.SG;
    const ghCopilotResp = await octokit(
      `GET /orgs/${org}/copilot/billing/seats?page=${pageNo}&per_page=${perPage}`
    );

    const reportsPerPage = ghCopilotResp.data as {
      total_seats: number;
      seats: Github.ExternalType.Api.GHCopilotReport[];
    };

    const newCounter = counter + reportsPerPage.seats.length;

    await Promise.all(
      reportsPerPage.seats.map((seat) =>
        sqsClient.sendMessage(seat, Queue.qGhCopilotFormat.queueUrl, { requestId })
      )
    );

    if (reportsPerPage.seats.length < perPage) {
      logger.info({ message: 'getGHCopilotReports.successful', data: newCounter });
      return newCounter;
    }

    return getGHCopilotReports(octokit, requestId, pageNo + 1, newCounter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error({ message: 'getGHCopilotReports.error', data: pageNo, error });

    if (error.status === 401) {
      // Generate new installation access token to make request
      const octokitInstance = await initializeOctokit();
      return getGHCopilotReports(octokitInstance, requestId, pageNo, counter);
    }
    if (error.status === 403) {
      const resetTime = new Date(parseInt(error.headers['X-Ratelimit-Reset'], 10) * 1000);
      const secondsUntilReset = Math.max(resetTime.getTime() - Date.now(), 0) / 1000;
      logger.info({
        message: 'getGHCopilotReports.info: Github API rate limit exceeded. Waiting until reset',
        data: secondsUntilReset,
        requestId,
      });
    }
    throw error;
  }
}

export async function handler(event: APIGatewayProxyEvent): Promise<void> {
  const requestId = uuid();
  try {
    const octokit = await initializeOctokit();
    await getGHCopilotReports(octokit, requestId);
  } catch (error: unknown) {
    logger.error({ message: 'github_copilot.handler.error', error, requestId });
    throw error;
  }
}
