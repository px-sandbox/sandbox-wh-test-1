/* eslint-disable max-lines-per-function */
import { RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { getOctokitTimeoutReqFn } from '../util/octokit-timeout-fn';
import { getInstallationAccessToken } from '../util/installation-access-token';
import { ghRequest } from './request-default';

const sqsClient = SQSClient.getInstance();

async function getUserList(
  octokit: RequestInterface<
    object & {
      headers: {
        Authorization: string | undefined;
      };
    }
  >,
  organizationName: string,
  requestId: string,
  orgId?: string | undefined,
  page = 1,
  counter = 0
): Promise<number> {
  try {
    logger.info({
      message: 'getUserList.invoked',
      data: { organizationName, page, counter },
      requestId,
    });
    const perPage = 100;

    const responseData = await octokit(
      `GET /orgs/${organizationName}/members?per_page=${perPage}&page=${page}`
    );
    const membersPerPage: Github.ExternalType.Api.User[] = responseData.data;
    const newCounter = counter + membersPerPage.length;

    await Promise.all(
      membersPerPage.map(async (member) =>
        sqsClient.sendMessage(
          { ...member, orgId, action: Github.Enums.Organization.MemberAdded },
          Queue.qGhUsersFormat.queueUrl,
          { requestId }
        )
      )
    );

    if (membersPerPage.length < perPage) {
      logger.info({ message: 'getUserList.successful', requestId });
      return newCounter;
    }
    return getUserList(octokit, organizationName, requestId, orgId, page + 1, newCounter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error({
      message: 'getUserList.error',
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
      return getUserList(
        octokitRequestWithTimeout,
        organizationName,
        requestId,
        orgId,
        page,
        counter
      );
    }
    throw error;
  }
}

export async function getUsers(
  octokit: RequestInterface<
    object & {
      headers: {
        Authorization: string | undefined;
      };
    }
  >,
  organizationName: string,
  requestId: string,
  orgId: string | undefined
): Promise<number> {
  let userCount: number;
  const noPrefixOrgId = orgId?.replace('gh_org_', '');
  try {
    userCount = await getUserList(octokit, organizationName, requestId, noPrefixOrgId);
    return userCount;
  } catch (error: unknown) {
    logger.error({ message: 'getUsers.list.error', error, requestId });
    throw error;
  }
}
