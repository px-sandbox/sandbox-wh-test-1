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

export async function updateWorklogDetails(
    data: Jira.Type.Worklog,
    reqCtx: Other.Type.RequestCtx,
    processId?: string
): Promise<void> {
    const { requestId, resourceId } = reqCtx;
    try {
        const updatedData = { ...data };
        const worklogId = `${data.body.id}`;
        const matchQry = esb
            .requestBodySearch()
            .query(
                esb
                    .boolQuery()
                    .must([
                        esb.termsQuery('body.id', worklogId),
                        esb.termQuery('body.organizationId.keyword', data.body.organizationId),
                    ])
            )
            .toJSON();
        const worklogData = await esClientObj.search(Jira.Enums.IndexName.Worklog, matchQry);
        const [formattedData] = await searchedDataFormator(worklogData);
        if (!formattedData || !formattedData._id) {
            logger.error({
                requestId,
                resourceId,
                data,
                message: 'updateWorklogDetails.error - No matching worklog found in Elasticsearch',
            });
        }
        if (formattedData) {
            updatedData.id = formattedData._id;
        }
        await esClientObj.updateDocument(Jira.Enums.IndexName.Worklog, formattedData._id, {
            body: {
                timeLogged: data.body.timeLogged,
                date: data.body.date,
                createdAt: data.body.createdAt,
            },
        });
        logger.info({ requestId, resourceId, message: 'updateWorklogDetails.successful' });
        await deleteProcessfromDdb(processId, reqCtx);
    } catch (error: unknown) {
        logger.error({
            requestId,
            resourceId,
            data,
            message: 'updateWorklogDetails.error',
            error,
        });
        throw error;
    }
}
