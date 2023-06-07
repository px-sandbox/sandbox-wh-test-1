import { RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { Queue } from 'sst/node/queue';
import { ghRequest } from './request-defaults';

export async function getBranches(
  octokit: RequestInterface<
    object & {
      headers: {
        authorization: string | undefined;
      };
    }
  >,
  repoId: string,
  repoName: string,
  repoOwner: string
): Promise<number> {
  let branchCount: Promise<number>;
  try {
    branchCount = await getBranchList(octokit, repoId, repoName, repoOwner);
    return branchCount;
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}

async function getBranchList(
  octokit: RequestInterface<
    object & {
      headers: {
        authorization: string | undefined;
      };
    }
  >,
  repoId: string,
  repoName: string,
  repoOwner: string,
  page = 1,
  counter = 0
): Promise<any> {
  try {
    logger.info('getBranchList.invoked', { repoName, repoOwner, page });
    const perPage = 100;

    const responseData = await octokit(
      `GET /repos/${repoOwner}/${repoName}/branches?per_page=${perPage}&page=${page}`
    );

    const branchesPerPage = responseData.data as Array<any>;

    counter += branchesPerPage.length;
    await Promise.all([
      branchesPerPage.map((branch) => {
        branch.id = Buffer.from(`${repoId}_${branch.name}`, 'binary').toString('base64');
        branch.repo_id = repoId;
        new SQSClient().sendMessage(branch, Queue.gh_branch_format.queueUrl);
      }),
    ]);

    if (branchesPerPage.length < perPage) {
      logger.info('getBranchList.successfull');
      return counter;
    }
    return getBranchList(octokit, repoId, repoName, repoOwner, ++page, counter);
  } catch (error: any) {
    logger.error('getBranchList.error', { repoName, repoOwner, page, error });

    if (error.status === 401) {
      const {
        body: { token },
      } = await getInstallationAccessToken();

      const octokitObj = ghRequest.request.defaults({
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      return getBranchList(octokitObj, repoId, repoName, repoOwner, page, counter);
    }
    throw error;
  }
}
