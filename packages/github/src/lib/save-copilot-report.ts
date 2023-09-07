import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';

export async function saveGHCopilotReport(data: Github.Type.GHCopilotReport): Promise<void> {
  try {
    const updatedData = { ...data };
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });

    await esClientObj.putDocument(Github.Enums.IndexName.GitCopilot, updatedData);
    logger.info('saveGHCopilotReport.successful');
  } catch (error: unknown) {
    logger.error(
      `saveGHCopilotReport.error :${error instanceof Error ? error.message : JSON.stringify(error)}`
    );
    throw error;
  }
}
