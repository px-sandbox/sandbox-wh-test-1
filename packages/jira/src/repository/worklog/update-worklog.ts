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
        const worklogId = data.body.id;
        await esClientObj.updateDocument(Jira.Enums.IndexName.Worklog, worklogId, {
            body: {
                timeLogged: data.body.timeLogged,
                date: data.body.date,
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
