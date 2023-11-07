import esb from 'elastic-builder';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { searchedDataFormator } from '../../util/response-formatter';
import { ParamsMapping } from '../../model/params-mapping';
import { mappingPrefixes } from '../../constant/config';


export async function saveIssueStatusDetails(data: Jira.Type.IssueStatus): Promise<void> {
    try {
        const updatedData = { ...data };
        const orgId = data.body.organizationId.split('org_')[1];
        await new DynamoDbDocClient().put(new ParamsMapping().preparePutParams(
            data.id,
            `${data.body.id}_${mappingPrefixes.org}_${orgId}`
        ));
        const esClientObj = new ElasticSearchClient({
            host: Config.OPENSEARCH_NODE,
            username: Config.OPENSEARCH_USERNAME ?? '',
            password: Config.OPENSEARCH_PASSWORD ?? '',
        });
        const matchQry =
            esb
                .boolQuery()
                .must([
                    esb.termsQuery('body.id', data.body.id),
                    esb.termQuery('body.organizationId', data.body.organizationId),
                ]).toJSON();
        const issueStatusData = await esClientObj.searchWithEsb(Jira.Enums.IndexName.IssueStatus, matchQry);
        const [formattedData] = await searchedDataFormator(issueStatusData);
        if (formattedData) {
            updatedData.id = formattedData._id;
        }
        await esClientObj.putDocument(Jira.Enums.IndexName.IssueStatus, updatedData);
        logger.info('saveIssueStatusDetails.successful');
    } catch (error: unknown) {
        logger.error('saveIssueStatusDetails.error', {
            error,
        });
        throw error;
    }
}
