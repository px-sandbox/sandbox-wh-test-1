import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import { deleteProcessfromDdb } from 'rp';
import { searchedDataFormator } from '../../util/response-formatter';

/**
 * Saves the details of a Jira worklog to DynamoDB and Elasticsearch.
 * @param data The worklog data to be saved.
 * @returns A Promise that resolves when the worklog details have been saved.
 * @throws Throws an error if there was an issue saving the worklog details.
 */

const esClientObj = ElasticSearchClient.getInstance();

export async function saveWorklogDetails(
    data: Jira.Type.Worklog,
    reqCtx: Other.Type.RequestCtx,
    processId?: string
): Promise<void> {
    const { requestId, resourceId } = reqCtx;
    logger.info({ data, requestId, resourceId, message: 'saveWorklogDetails.data' });
    try {
        const updatedData = { ...data };
        const matchQry = esb
            .requestBodySearch()
            .query(
                esb
                    .boolQuery()
                    .must([
                        esb.termsQuery('body.id', data.id),
                        esb.termQuery('body.organizationId.keyword', data?.body.organizationId),
                    ])
            )
            .toJSON();
        const worklogData = await esClientObj.search(Jira.Enums.IndexName.Worklog, matchQry);
        const [formattedData] = await searchedDataFormator(worklogData);
        if (formattedData) {
            updatedData.id = formattedData._id;
        }
        await esClientObj.putDocument(Jira.Enums.IndexName.Worklog, updatedData);
        logger.info({ requestId, resourceId, message: 'saveWorklogDetails.successful' });
    } catch (error: unknown) {
        logger.error({ requestId, resourceId, message: 'saveWorklogDetails.error', error });
        throw error;
    }
}
