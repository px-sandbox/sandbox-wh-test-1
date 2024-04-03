import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import { mappingPrefixes } from '../../constant/config';
import { searchedDataFormatorWithDeleted } from '../../util/response-formatter';
import { getOrganization } from '../organization/get-organization';

/**
 * Retrieves a Jira user by their ID.
 * @param issueId The ID of the issue to retrieve.
 * @returns A promise that resolves with the user data.
 * @throws An error if the user cannot be retrieved.
 */
const esClientObj = ElasticSearchClient.getInstance();
export async function getIssueById(
  issueId: string,
  organization: string
): Promise<Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody> {
  try {
    const orgData = await getOrganization(organization);
    if (!orgData) {
      logger.error(`Organization ${organization} not found`);
      throw new Error(`Organization ${organization} not found`);
    }
    const matchQry = esb
      .boolQuery()
      .must([
        esb.termsQuery('body.id', `${mappingPrefixes.issue}_${issueId}`),
        esb.termQuery('body.organizationId.keyword', `${orgData.id}`),
      ])
      .toJSON();
    const issueData = await esClientObj.search(Jira.Enums.IndexName.Issue, matchQry);
    const [formattedIssueData] = await searchedDataFormatorWithDeleted(issueData);
    return formattedIssueData;
  } catch (error: unknown) {
    logger.error('getIssueById.error', { error });
    throw error;
  }
}

export async function getReopenRateDataById(
  issueId: string,
  sprintId: string,
  organization: string
): Promise<Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody> {
  try {
    const orgData = await getOrganization(organization);
    if (!orgData) {
      logger.error(`Organization ${organization} not found`);
      throw new Error(`Organization ${organization} not found`);
    }
    const matchQry = esb
      .boolQuery()
      .must([
        // eslint-disable-next-line max-len
        esb.termsQuery(
          'body.id',
          `${mappingPrefixes.reopen_rate}_${issueId}_${mappingPrefixes.sprint}_${sprintId}`
        ),
        esb.termQuery('body.organizationId', `${orgData.id}`),
      ])
      .toJSON();

    const reopenRateData = await esClientObj.search(Jira.Enums.IndexName.ReopenRate, matchQry);
    const [formattedIssueData] = await searchedDataFormatorWithDeleted(reopenRateData);
    return formattedIssueData;
  } catch (error: unknown) {
    logger.error('getReopenRateDataById.error', { error });
    throw error;
  }
}

export async function getReopenRateDataByIssueId(
  issueId: string,
  organization: string
): Promise<Pick<Other.Type.Hit, '_id'>[] & Other.Type.HitBody> {
  try {
    const orgData = await getOrganization(organization);
    if (!orgData) {
      logger.error(`Organization ${organization} not found`);
      throw new Error(`Organization ${organization} not found`);
    }
    const matchQry = esb
      .requestBodySearch().query(esb
      .boolQuery()
      .must([
        esb.termsQuery('body.issueId', `${mappingPrefixes.issue}_${issueId}`),
        esb.termQuery('body.organizationId', `${orgData.id}`),
      ]))
      .toJSON();

    const reopenRateData = await esClientObj.search(Jira.Enums.IndexName.ReopenRate, matchQry);
    const formattedIssueData = await searchedDataFormatorWithDeleted(reopenRateData);
    return formattedIssueData;
  } catch (error: unknown) {
    logger.error('getReopenRateDataByIssueId.error', { error });
    throw error;
  }
}
