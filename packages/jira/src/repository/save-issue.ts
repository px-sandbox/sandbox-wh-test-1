import esb from 'elastic-builder';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { searchedDataFormator } from '../util/response-formatter';
import { ParamsMapping } from '../model/params-mapping';

export async function saveIssueDetails(data: Jira.Type.Issue): Promise<void> {
  try {
    const updatedData = { ...data };
    await new DynamoDbDocClient().put(new ParamsMapping().preparePutParams(data.id, data.body.id,
      data.body.organizationId));
    const esClientObj = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry = esb.matchQuery('body.id', data.body.id).toJSON();
    const issueData = await esClientObj.searchWithEsb(Jira.Enums.IndexName.Issue, matchQry);
    const [formattedData] = await searchedDataFormator(issueData);
    if (formattedData) {
      updatedData.id = formattedData._id;
      updatedData.body.changelog.items = [
        ...formattedData.changelog.items,
        ...data.body.changelog.items,
      ];
    }
    await esClientObj.putDocument(Jira.Enums.IndexName.Issue, updatedData);
    logger.info('saveIssueDetails.successful');
  } catch (error: unknown) {
    logger.error('saveIssueDetails.error', {
      error,
    });
    throw error;
  }
}
