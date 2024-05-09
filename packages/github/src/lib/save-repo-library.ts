import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import { logger } from 'core';
import { deleteProcessfromDdb } from 'rp';

const esClientObj = ElasticSearchClient.getInstance();

export async function saveRepoLibraryDetails(
  data: Github.Type.RepoLibrary,
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  try {
    const { processId, ...updatedData } = data;
    await esClientObj.putDocument(Github.Enums.IndexName.GitRepoLibrary, updatedData);
    logger.info({ message: 'saveRepoLibraryDetails.successful', ...reqCtx });
    await deleteProcessfromDdb(processId, reqCtx);
  } catch (error: unknown) {
    logger.error({ message: 'saveRepoLibraryDetails.error', error, ...reqCtx });
    throw error;
  }
}
