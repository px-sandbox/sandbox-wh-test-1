import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import { mappingPrefixes } from '../../constant/config';
import { searchedDataFormatorWithDeleted } from '../../util/response-formatter';
import { getOrganization } from '../organization/get-organization';

/**
 * Retrieves worklog data by worklog ID.
 * @param worklogId - The ID of the worklog to retrieve.
 * @param organization - The organization ID.
 * @param reqCtx - Request context for logging.
 * @returns A promise that resolves with the formatted worklog data.
 * @throws An error if the worklog data cannot be retrieved.
 */
export async function getWorklogById(
    worklogId: string,
    organization: string,
    reqCtx: Other.Type.RequestCtx
): Promise<Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody> {
    try {
        const esClientObj = ElasticSearchClient.getInstance();

        // Fetch organization details
        const orgData = await getOrganization(organization);
        if (!orgData) {
            logger.error({ ...reqCtx, message: `Organization ${organization} not found` });
            throw new Error(`Organization ${organization} not found`);
        }

        // Construct ElasticSearch query
        const matchQry = esb
            .requestBodySearch()
            .query(
                esb
                    .boolQuery()
                    .must([
                        esb.termsQuery('body.id', `${mappingPrefixes.worklog}_${worklogId}`),
                    ])
            )
            .toJSON();

        // Execute search query
        const worklogData = await esClientObj.search(Jira.Enums.IndexName.Worklog, matchQry);

        // Format search results
        const [formattedWorklogData] = await searchedDataFormatorWithDeleted(worklogData);
        return formattedWorklogData;
    } catch (error: unknown) {
        logger.error({ ...reqCtx, message: 'getWorklogById.error', error });
        throw error;
    }
}
