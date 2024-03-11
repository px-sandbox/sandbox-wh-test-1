import { ElasticSearchClientGh } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';

const esClientObj = ElasticSearchClientGh.getInstance();

export async function saveGHCopilotReport(data: Github.Type.GHCopilotReport): Promise<void> {
  try {
    const updatedData = { ...data };
    await esClientObj.putDocument(Github.Enums.IndexName.GitCopilot, updatedData);
    logger.info('saveGHCopilotReport.successful');
  } catch (error: unknown) {
    logger.error(
      `saveGHCopilotReport.error :${error instanceof Error ? error.message : JSON.stringify(error)}`
    );
    throw error;
  }
}
