import { OctokitResponse, RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { getInstallationAccessToken } from '../util/installation-access-token';
import { ghRequest } from './request-default';

async function getReposList(
  octokit: RequestInterface<
    object & {
      headers: {
        authorization: string | undefined;
      };
    }
  >,
  organizationName: string,
  page = 1,
  counter = 0
): Promise<number> {
  try {
    logger.info('getReposList.invoked', { organizationName, page, counter });
    const perPage = 100;

    const responseData = await octokit(
      `GET /orgs/${organizationName}/repos?per_page=${perPage}&page=${page}`
    );
    const reposPerPage = responseData.data as Array<OctokitResponse<string>>;
    const newCounter = counter + reposPerPage.length;

    await Promise.all(
      reposPerPage.map(async (repo) =>
        new SQSClient().sendMessage(repo, Queue.gh_repo_format.queueUrl)
      )
    );

    if (reposPerPage.length < perPage) {
      logger.info('getReposList.successfull');
      return newCounter;
    }
    return getReposList(octokit, organizationName, page + 1, newCounter);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error('getReposList.error', {
      organizationName,
      error,
      page,
      counter,
    });
    if (error.status === 401) {
      const {
        body: { token },
      } = await getInstallationAccessToken();

      const octokitObj = ghRequest.request.defaults({
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      return getReposList(octokitObj, organizationName, page, counter);
    }
    throw error;
  }
}

export async function getRepos(
  octokit: RequestInterface<
    object & {
      headers: {
        authorization: string | undefined;
      };
    }
  >,
  organizationName: string
): Promise<number> {
  let repoCount: number;
  try {
    repoCount = await getReposList(octokit, organizationName);
    return repoCount;
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
