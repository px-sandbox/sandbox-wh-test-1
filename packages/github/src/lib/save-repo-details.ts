import { Github } from 'abstraction';
import { ElasticClient, find, logger, updateTable } from 'core';
import { repoFormator } from 'src/util/repoFormator';

export async function saveRepoDetails(data: Github.ExternalType.Api.Repository): Promise<void> {
	try {
		const record = await find(`gh_repo_${data?.id}`);
		const result = await repoFormator(data, record?.parentId);
		logger.info(result);
		if (!record) {
			logger.info('---NEW_RECORD_FOUND---');
			await updateTable(result);
		}
		await ElasticClient.saveOrUpdateDocument(Github.Enums.IndexName.GitRepo, result);
	} catch (error: unknown) {
		logger.error({
			error,
		});
		throw error;
	}
}
