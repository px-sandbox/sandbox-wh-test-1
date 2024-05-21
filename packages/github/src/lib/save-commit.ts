import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { deleteProcessfromDdb } from 'rp';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

export async function saveCommitDetails(
  data: Github.Type.Commits,
  reqCtx: Other.Type.RequestCtx,
  processId?: string
): Promise<void> {
  const { requestId, resourceId } = reqCtx;
  try {
    const updatedData = { ...data };
    const matchQry = esb
      .requestBodySearch()
      .query(esb.matchQuery('body.id', data.body.id))
      .toJSON();
    const commitData = await esClientObj.search(Github.Enums.IndexName.GitCommits, matchQry);

    const [formattedData] = await searchedDataFormator(commitData);

    if (formattedData) {
      updatedData.body.createdAt = formattedData.createdAt;
    }

    const {
      body: { committedAt, ...restbody },
      id,
    } = updatedData;

    const commitIndexData = {
      id,
      body: {
        ...restbody,
        committedAt: new Date(committedAt), // Change the committedAt value
      },
    };

    await esClientObj.putDocument(Github.Enums.IndexName.GitCommits, commitIndexData);

    logger.info({ message: 'saveCommitDetails.successful', requestId, resourceId });
    await deleteProcessfromDdb(processId, { requestId, resourceId });
  } catch (error: unknown) {
    logger.error({ message: 'saveCommitDetails.error', error, requestId, resourceId });
    throw error;
  }
}
