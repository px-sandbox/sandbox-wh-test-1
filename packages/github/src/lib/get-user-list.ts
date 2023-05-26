import { RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { Queue } from 'sst/node/queue';
import { ghRequest } from './request-defaults';

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
    counter += membersPerPage.length;
    membersPerPage.forEach(async (member) => {
      await new SQSClient().sendMessage(member, Queue.gh_users_format.queueUrl);
    });

    if (membersPerPage.length < perPage) {
      logger.info('getUserList.successful');
      return counter;
    }
    return getUserList(octokit, organizationName, ++page, counter);
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
