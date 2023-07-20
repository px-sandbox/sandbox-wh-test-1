import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { User } from 'abstraction/github/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { ParamsMapping } from 'src/model/params-mapping';
import { searchedDataFormator } from 'src/util/response-formatter';
import { Config } from 'sst/node/config';

export async function saveCommitDetails(data: Github.Type.Commits): Promise<void> {
  try {
    await new DynamoDbDocClient().put(new ParamsMapping().preparePutParams(data.id, data.body.id));
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry = esb.matchQuery('body.id', data.body.id).toJSON();
    const userData = await esClientObj.searchWithEsb(Github.Enums.IndexName.GitCommits, matchQry);
    const formattedData = await searchedDataFormator(userData);
    if (formattedData[0]) {
      logger.info('LAST_ACTIONS_PERFORMED', formattedData[0].action);
      data.body.action = [...formattedData[0].action, ...data.body.action];
      data.body.createdAt = formattedData[0].createdAt;
    }
    await esClientObj.putDocument(Github.Enums.IndexName.GitCommits, data);

    // Store timezone in git_user index
    const userDocQuery = esb.matchQuery('body.id', data.body.authorId).toJSON();
    const authorData = await esClientObj.searchWithEsb(
      Github.Enums.IndexName.GitUsers,
      userDocQuery
    );
    const authorDataFormat = await searchedDataFormator(authorData);
    if (authorDataFormat) {
      const authData: User = {
        id: authorDataFormat[0]._id,
        body: {
          id: authorDataFormat[0].id,
          githubUserId: authorDataFormat[0].githubUserId,
          userName: authorDataFormat[0].userName,
          avatarUrl: authorDataFormat[0].avatarUrl,
          organizationId: authorDataFormat[0].organizationId,
          deletedAt: authorDataFormat[0].deletedAt,
          createdAt: authorDataFormat[0].createdAt,
          action: authorDataFormat[0].action,
          createdAtDay: authorDataFormat[0].createdAtDay,
          computationalDate: authorDataFormat[0].computationalDate,
          githubDate: authorDataFormat[0].githubDate,
          timezone: data.body.committedAt.split('+')[1],
        },
      };
      await esClientObj.putDocument(Github.Enums.IndexName.GitUsers, authData);
    }
    logger.info('saveCommitDetails.successful');
  } catch (error: unknown) {
    logger.error('saveCommitDetails.error', {
      error,
    });
    throw error;
  }
}
