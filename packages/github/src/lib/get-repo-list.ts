/* eslint-disable max-lines-per-function */
import { OctokitResponse, RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { getOctokitTimeoutReqFn } from '../util/octokit-timeout-fn';
import { getInstallationAccessToken } from '../util/installation-access-token';
import { ghRequest } from './request-default';

const sqsClient = SQSClient.getInstance();
async function getReposList(
  octokit: RequestInterface<
    object & {
      headers: {
        Authorization: string | undefined;
      };
    }
  >,
  organizationName: string,
  requestId: string,
  page = 1,
  counter = 0
): Promise<number> {
  try {
    logger.info({
      message: 'getReposList.invoked',
      data: { organizationName, page, counter },
      requestId,
    });
    const perPage = 1;

    const responseData = await octokit(
      `GET /orgs/${organizationName}/repos?per_page=${perPage}&page=${page}`
    );
    const reposPerPage = responseData.data as Array<OctokitResponse<string>>;
    const newCounter = counter + reposPerPage.length;

    await Promise.all(
      reposPerPage.map(async (repo) => {
        sqsClient.sendMessage(repo, Queue.qGhRepoFormat.queueUrl, { requestId });
        sqsClient.sendMessage(repo, Queue.qGhHistoricalBranch.queueUrl, { requestId });
        sqsClient.sendMessage(repo, Queue.qGhHistoricalPr.queueUrl, { requestId });
      })
    );

    if (reposPerPage.length <= 1) {
      logger.info({ message: 'getReposList.successful' });
      return newCounter;
    }
    return getReposList(octokit, organizationName, requestId, page + 1, newCounter);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error({
      message: 'getReposList.error',
      data: {
        organizationName,
        page,
        counter,
      },
      error,
      requestId,
    });
    if (error.status === 401) {
      const {
        body: { token },
      } = await getInstallationAccessToken(organizationName);

      const octokitObj = ghRequest.request.defaults({
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokitObj);
      return getReposList(octokitRequestWithTimeout, organizationName, requestId, page, counter);
    }
    throw error;
  }
}

export async function getRepos(
  octokit: RequestInterface<
    object & {
      headers: {
        Authorization: string | undefined;
      };
    }
  >,
  organizationName: string,
  requestId: string
): Promise<number> {
  let repoCount: number;
  try {
    repoCount = await getReposList(octokit, organizationName, requestId);
    return repoCount;
  } catch (error: unknown) {
    logger.error({ message: 'getRepos.list.error', error, requestId });
    throw error;
  }
}
