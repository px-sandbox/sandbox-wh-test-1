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

    logger.info('saveCommitDetails.invoked', { receivingData: data });

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

    // TODO: check for duplicacy of user index
    // Store timezone in git_user index
    // if (data.body.authorId) {
    //   const userDocQuery = esb.matchQuery('body.id', data.body.authorId).toJSON();
    //   const authorData = await esClientObj.searchWithEsb(
    //     Github.Enums.IndexName.GitUsers,
    //     userDocQuery
    //   );
    //   const [author] = await searchedDataFormator(authorData);
    //   if (author) {
    //     const timezone = data.body.committedAt.substring(19);
    //     const authorData: User = {
    //       id: author._id,
    //       body: {
    //         id: author.id,
    //         githubUserId: author.githubUserId,
    //         userName: author.userName,
    //         avatarUrl: author.avatarUrl,
    //         organizationId: author.organizationId,
    //         deletedAt: author.deletedAt,
    //         createdAt: author.createdAt,
    //         action: author.action,
    //         createdAtDay: author.createdAtDay,
    //         computationalDate: author.computationalDate,
    //         githubDate: author.githubDate,
    //         timezone,
    //       },
    //     };
    //     logger.info('USER_DATA_UPDATE_WITH_TIMEZONE', authorData);
    //     await esClientObj.putDocument(Github.Enums.IndexName.GitUsers, authorData);
    //   }
    // }
    logger.info('saveCommitDetails.successful');
  } catch (error: unknown) {
    logger.error('saveCommitDetails.error', {
      errorInfo: JSON.stringify(error),
    });
    throw error;
  }
}
