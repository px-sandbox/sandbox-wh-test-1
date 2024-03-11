import { ElasticSearchClientGh } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClientGh.getInstance();

export async function saveCommitDetails(data: Github.Type.Commits): Promise<void> {
  try {
    const updatedData = { ...data };
    const matchQry = esb.matchQuery('body.id', data.body.id).toJSON();
    const commitData = await esClientObj.searchWithEsb(Github.Enums.IndexName.GitCommits, matchQry);

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

    // TODO: check for duplicacy of user index and update user index timezone

    logger.info('saveCommitDetails.successful');
  } catch (error: unknown) {
    logger.error(`saveCommitDetails.error, ${error}`);
    throw error;
  }
}
