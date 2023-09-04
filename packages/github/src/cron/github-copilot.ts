import { RequestInterface } from '@octokit/types';
import { Queue } from 'sst/node/queue';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { Github } from 'abstraction';
import { ghRequest } from '../lib/request-default';
import { getInstallationAccessToken } from '../util/installation-access-token';

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
      `GET /org/${org}/copilot/billing/seats?page=${pageNo}&per_page=${perPage}}`
    );
    const reportsPerPage = ghCopilotResp.data as {
      total_seats: number;
      seats: Github.ExternalType.Api.GHCopilotReports[];
    };

    const newCounter = counter + reportsPerPage.seats.length;
    await Promise.all([
      reportsPerPage.seats.map(async (seat) => {
        await new SQSClient().sendMessage(seat, Queue.gh_copilot_format.queueUrl);
      }),
    ]);

    if (reportsPerPage.seats.length < perPage) {
      logger.info('getGHCopilotReports.successfull');
      return newCounter;
    }
    return getGHCopilotReports(octokit, pageNo + 1, newCounter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error('getGHCopilotReports.error', { pageNo, error });

    if (error.status === 401) {
      return getGHCopilotReports(octokit, pageNo, counter);
    }
    throw error;
  }
}

export async function handler(): Promise<void> {
  try {
    const installationAccessToken = await getInstallationAccessToken();
    const octokit = ghRequest.request.defaults({
      headers: {
        Authorization: `Bearer ${installationAccessToken.body.token}`,
      },
    });
    await getGHCopilotReports(octokit);
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
