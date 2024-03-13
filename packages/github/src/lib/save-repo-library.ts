import { ElasticSearchClientGh } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';

const esClientObj = ElasticSearchClientGh.getInstance();

export async function saveRepoLibraryDetails(data: Github.Type.RepoLibrary): Promise<void> {
  try {
    const updatedData = { ...data };
    await esClientObj.putDocument(Github.Enums.IndexName.GitRepoLibrary, updatedData);
    logger.info('saveRepoLibraryDetails.successful');
  } catch (error: unknown) {
    logger.error('saveRepoLibraryDetails.error', {
      error,
    });
    throw error;
  }
}
