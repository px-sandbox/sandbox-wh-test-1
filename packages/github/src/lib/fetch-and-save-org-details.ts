import { RequestInterface } from '@octokit/types';
import { Github } from 'abstraction';
import { ElasticClient, find, logger, updateTable } from 'core';
import { organizationFormator } from '../util/organization-formatter';

export async function fetchAndSaveOrganizationDetails(
	octokit: RequestInterface<
    object & {
      headers: {
        authorization: string | undefined;
      };
    }
  >,
	organizationName: string
): Promise<{ name: string }> {
	try {
		logger.info('getOrganizationDetails.invoked');
		const responseData = await octokit(`GET /orgs/${organizationName}`);
		if (responseData?.data) {
			const record = await find(`gh_org_${responseData.data.id}`);
			const result = await organizationFormator(responseData.data, record?.parentId);
			if (!record) {
				logger.info('---NEW_RECORD_FOUND---');

				await updateTable(result);
			}
			await ElasticClient.saveOrUpdateDocument(Github.Enums.IndexName.GitOrganization, result);
		}
		logger.info('getOrganizationDetails.successfull', {
			response: responseData?.data,
		});
		return {
			name: responseData?.data?.login,
		};
	} catch (error: unknown) {
		logger.error({
			error,
		});
		throw error;
	}
}
