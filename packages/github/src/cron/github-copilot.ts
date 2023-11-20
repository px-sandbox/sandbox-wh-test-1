import { RequestInterface } from '@octokit/types';
import { Queue } from 'sst/node/queue';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { Github } from 'abstraction';
import { ghRequest } from '../lib/request-default';
import { getInstallationAccessToken } from '../util/installation-access-token';

async function initializeOctokit(): Promise<
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
  return octokit;
}
async function getGHCopilotReports(
  octokit: RequestInterface<
    object & {
      headers: {
        Authorization: string | undefined;
      };
    }
  >,
  pageNo = 1,
  counter = 0
): Promise<number> {
  try {
    logger.info(`Github Copilot invoked at: ${new Date().toISOString()}`);
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
        new SQSClient().sendMessage(seat, Queue.qGhCopilotFormat.queueUrl)
      )
    );

    if (reportsPerPage.seats.length < perPage) {
      logger.info(`getGHCopilotReports.successfull for ${newCounter} records`);
      return newCounter;
    }

    return getGHCopilotReports(octokit, pageNo + 1, newCounter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error('getGHCopilotReports.error', { pageNo, error });

    if (error.status === 401) {
      // Generate new installation access token to make request
      const octokitInstance = await initializeOctokit();
      return getGHCopilotReports(octokitInstance, pageNo, counter);
    }
    if (error.status === 403) {
      const resetTime = new Date(parseInt(error.headers['X-Ratelimit-Reset'], 10) * 1000);
      const secondsUntilReset = Math.max(resetTime.getTime() - Date.now(), 0) / 1000;
      logger.warn(
        `GitHub API rate limit exceeded. Waiting ${secondsUntilReset} seconds until reset.`
      );
    }
    throw error;
  }
}

export async function handler(): Promise<void> {
  try {
    const octokit = await initializeOctokit();
    await getGHCopilotReports(octokit);
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
