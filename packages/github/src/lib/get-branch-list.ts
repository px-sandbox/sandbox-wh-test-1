import { RequestInterface } from '@octokit/types';
import { logger, sqsDataSender } from 'core';
import { Github } from 'abstraction';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
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
		branchesPerPage.forEach(async (branch) => {
			branch.id = Buffer.from(`${repoId}_${branch.name}`, 'binary').toString('base64');
			branch.repo_id = repoId;
			await sqsDataSender({
				data: branch,
				type: Github.Enums.IndexName.GitBranch,
			});
		});

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
