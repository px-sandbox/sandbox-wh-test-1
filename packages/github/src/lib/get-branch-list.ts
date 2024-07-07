import { RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { Github, Other } from 'abstraction';
import { getOctokitTimeoutReqFn } from '../util/octokit-timeout-fn';
import { getInstallationAccessToken } from '../util/installation-access-token';
import { ghRequest } from './request-default';

const sqsClient = SQSClient.getInstance();
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
  reqCtx: Other.Type.RequestCtx,
  page = 1,
  counter = 0
): Promise<number> {
  try {
    logger.info({
      message: 'getBranchList.invoked',
      data: { repoName, repoOwner, page },
      ...reqCtx,
    });
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
        return sqsClient.sendMessage(branchInfo, Queue.qGhBranchFormat.queueUrl, { ...reqCtx });
      }),
    ]);

    if (branchesPerPage.length < perPage) {
      logger.info({ message: 'getBranchList.successful', ...reqCtx });
      return newCounter;
    }
    return getBranchList(octokit, repoId, repoName, repoOwner, reqCtx, page + 1, newCounter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error({
      message: 'getBranchList.error',
      data: { repoName, repoOwner, page },
      error,
      ...reqCtx,
    });

    if (error.status === 401) {
      return getBranchList(octokit, repoId, repoName, repoOwner, reqCtx, page, counter);
    }
    throw error;
  }
}

export async function getBranches(
  repoId: string,
  repoName: string,
  repoOwner: string,
  reqCtx: Other.Type.RequestCtx
): Promise<number> {
  let branchCount: number;
  try {
    const installationAccessToken = await getInstallationAccessToken();
    const octokit = ghRequest.request.defaults({
      headers: {
        Authorization: `Bearer ${installationAccessToken.body.token}`,
      },
    });
    const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);
    branchCount = await getBranchList(
      octokitRequestWithTimeout,
      repoId,
      repoName,
      repoOwner,
      reqCtx
    );
    return branchCount;
  } catch (error: unknown) {
    logger.error({ message: 'getBranches.error', data: { repoName, repoOwner }, error });
    throw error;
  }
}
