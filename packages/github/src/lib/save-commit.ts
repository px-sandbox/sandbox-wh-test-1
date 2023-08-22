import esb from 'elastic-builder';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { ParamsMapping } from '../model/params-mapping';
import { searchedDataFormator } from '../util/response-formatter';

export async function saveCommitDetails(data: Github.Type.Commits): Promise<void> {
  try {
    await new DynamoDbDocClient().put(new ParamsMapping().preparePutParams(data.id, data.body.id));

    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry = esb.matchQuery('body.id', data.body.id).toJSON();
    const commitData = await esClientObj.searchWithEsb(Github.Enums.IndexName.GitCommits, matchQry);

    const [formattedData] = await searchedDataFormator(commitData);

    if (formattedData) {
      data.body.createdAt = formattedData.createdAt;
    }

    const {
      body: { committedAt, ...restbody },
      id,
    } = data;

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
    logger.error('saveCommitDetails.error', {
      errorInfo: JSON.stringify(error),
    });
    throw error;
  }
}
