import { RequestInterface } from '@octokit/types';
import { SQSClient, SQSClientGh } from '@pulse/event-handler';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { Github } from 'abstraction';
import { getInstallationAccessToken } from '../util/installation-access-token';
import { ghRequest } from './request-default';

const sqsClient = SQSClientGh.getInstance();
async function getBranchList(
  octokit: RequestInterface<
    object & {
      headers: {
        Authorization: string | undefined;
      };
    }
  >,
  repoId: string,
  repoName: string,
  repoOwner: string,
  page = 1,
  counter = 0
): Promise<number> {
  try {
    logger.info('getBranchList.invoked', { repoName, repoOwner, page });
    const perPage = 100;

    const responseData = await octokit(
      `GET /repos/${repoOwner}/${repoName}/branches?per_page=${perPage}&page=${page}`
    );

    const branchesPerPage = responseData.data as Github.ExternalType.Api.BranchList;

    const newCounter = counter + branchesPerPage.length;
    await Promise.all([
      branchesPerPage.map(async (branch) => {
        const branchInfo = { ...branch };
        branchInfo.id = Buffer.from(`${repoId}_${branchInfo.name}`, 'binary').toString('base64');
        branchInfo.repo_id = repoId;
        return sqsClient.sendMessage(branchInfo, Queue.qGhBranchFormat.queueUrl);
      }),
    ]);

    if (branchesPerPage.length < perPage) {
      logger.info('getBranchList.successful');
      return newCounter;
    }
    return getBranchList(octokit, repoId, repoName, repoOwner, page + 1, newCounter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error('getBranchList.error', { repoName, repoOwner, page, error });

    if (error.status === 401) {
      return getBranchList(octokit, repoId, repoName, repoOwner, page, counter);
    }
    throw error;
  }
}

export async function getBranches(
  repoId: string,
  repoName: string,
  repoOwner: string
): Promise<number> {
  let branchCount: number;
  try {
    const installationAccessToken = await getInstallationAccessToken();
    const octokit = ghRequest.request.defaults({
      headers: {
        Authorization: `Bearer ${installationAccessToken.body.token}`,
      },
    });
    branchCount = await getBranchList(octokit, repoId, repoName, repoOwner);
    return branchCount;
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
