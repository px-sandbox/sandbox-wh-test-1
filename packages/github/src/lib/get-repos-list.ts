import { logger, sqsDataSender } from 'core';
import { RequestInterface } from '@octokit/types';
import { Github } from 'abstraction';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { getBranches } from './get-branch-list';
import { ghRequest } from './request-defaults';

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

		const reposPerPage = responseData.data as Array<any>;
		counter += reposPerPage.length;
		reposPerPage.forEach(async (repo) => {
			await Promise.all([
				sqsDataSender({
					data: repo,
					type: Github.Enums.IndexName.GitRepo,
				}),
				getBranches(octokit, repo.id, repo.name, repo.owner.login),
			]);
		});
		if (reposPerPage.length < perPage) {
			logger.info('getReposList.successfull');
			return counter;
		} 
			return getReposList(octokit, organizationName, ++page, counter);
		
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
