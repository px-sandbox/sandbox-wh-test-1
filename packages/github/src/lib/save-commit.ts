import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

export async function saveCommitDetails(data: Github.Type.Commits): Promise<void> {
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

    logger.info('saveCommitDetails.successful');
  } catch (error: unknown) {
    logger.error(`saveCommitDetails.error, ${error}`);
    throw error;
  }
}
