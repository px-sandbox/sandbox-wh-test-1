import { logger, sqsDataSender } from 'core';
import { ghRequest } from './request-defaults';
import { Github } from 'abstraction';
import { RequestInterface } from '@octokit/types';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';

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
    let responseData;
    const perPage = 100;

    responseData = await octokit(
      `GET /orgs/${organizationName}/members?per_page=${perPage}&page=${page}`
    );

    const membersPerPage = responseData.data as Github.ExternalType.Api.User[];

    counter += membersPerPage.length;
    membersPerPage.forEach(async (member) => {
      await sqsDataSender({
        data: member,
        type: Github.Enums.IndexName.GitUsers,
      });
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
