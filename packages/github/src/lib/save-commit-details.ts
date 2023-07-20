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
    const userDocQuery = esb.matchQuery('body.id', 'gh_user_66475255').toJSON();
    const authorData = await esClientObj.searchWithEsb(
      Github.Enums.IndexName.GitUsers,
      userDocQuery
    );
    const authorDataFormat = await searchedDataFormator(authorData);
    if (authorDataFormat) {
      const [author] = authorDataFormat;
      const timezone = data.body.committedAt.split('+')[1];
      const authorData: User = {
        id: author._id,
        body: {
          id: author.id,
          githubUserId: author.githubUserId,
          userName: author.userName,
          avatarUrl: author.avatarUrl,
          organizationId: author.organizationId,
          deletedAt: author.deletedAt,
          createdAt: author.createdAt,
          action: author.action,
          createdAtDay: author.createdAtDay,
          computationalDate: author.computationalDate,
          githubDate: author.githubDate,
          timezone: timezone,
        },
      };
      logger.info('USER_DATA_UPDATE_WITH_TIMEZONE', authorData);
      await esClientObj.putDocument(Github.Enums.IndexName.GitUsers, authorData);
    }
    logger.info('saveCommitDetails.successful');
  } catch (error: unknown) {
    logger.error('saveCommitDetails.error', {
      error,
    });
    throw error;
  }
}
