import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import { logger } from 'core';
import { deleteProcessfromDdb } from 'src/util/delete-process';

const esClientObj = ElasticSearchClient.getInstance();

export async function saveRepoLibraryDetails(data: Github.Type.RepoLibrary, reqCntx: Other.Type.RequestCtx): Promise<void> {
  try {
    const { processId, ...updatedData } = data;
    await esClientObj.putDocument(Github.Enums.IndexName.GitRepoLibrary, updatedData);
    logger.info({ message: 'saveRepoLibraryDetails.successful', ...reqCntx});
    await deleteProcessfromDdb(processId, reqCntx);
  } catch (error: unknown) {
    logger.error({message: 'saveRepoLibraryDetails.error', 
      error,
      ...reqCntx
    });
    throw error;
  }
}
