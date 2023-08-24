import { RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { getInstallationAccessToken } from '../util/installation-access-token';
import { ghRequest } from './request-default';

async function getUserList(
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
    logger.info('getUserList.invoked', { organizationName, page, counter });
    const perPage = 100;

    const responseData = await octokit(
      `GET /orgs/${organizationName}/members?per_page=${perPage}&page=${page}`
    );
    const membersPerPage: Github.ExternalType.Api.User[] = responseData.data;
    logger.info('Response', membersPerPage);
    const newCounter = counter + membersPerPage.length;

    await Promise.all(
      membersPerPage.map(
        async (member) => await new SQSClient().sendMessage(member, Queue.gh_users_format.queueUrl)
      )
    );

    if (membersPerPage.length < perPage) {
      logger.info('getUserList.successful');
      return newCounter;
    }
    return getUserList(octokit, organizationName, page + 1, newCounter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error('getUserList.error', {
      organizationName,
      page,
      counter,
      error,
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

      return getUserList(octokitObj, organizationName, page, counter);
    }
    throw error;
  }
}

export async function getUsers(
  octokit: RequestInterface<
    object & {
      headers: {
        authorization: string | undefined;
      };
    }
  >,
  organizationName: string
): Promise<number> {
  let userCount: number;
  try {
    userCount = await getUserList(octokit, organizationName);
    return userCount;
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
