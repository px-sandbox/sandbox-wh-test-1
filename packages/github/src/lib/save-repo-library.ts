import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { deleteProcessfromDdb } from 'src/util/delete-process';

const esClientObj = ElasticSearchClient.getInstance();

export async function saveRepoLibraryDetails(data: Github.Type.RepoLibrary): Promise<void> {
  try {
    const { processId, ...updatedData } = data;
    await esClientObj.putDocument(Github.Enums.IndexName.GitRepoLibrary, updatedData);
    logger.info('saveRepoLibraryDetails.successful');
    if (processId) {
      logger.info('deleting_process_from_DDB', { processId });
      await deleteProcessfromDdb(processId);
    }
  } catch (error: unknown) {
    logger.error('saveRepoLibraryDetails.error', {
      error,
    });
    throw error;
  }
}
