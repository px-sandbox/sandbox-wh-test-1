import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
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
  organization: string,
  reqCtx: Other.Type.RequestCtx
): Promise<Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody> {
  try {
    const orgData = await getOrganization(organization);
    if (!orgData) {
      logger.error({ ...reqCtx, message: `Organization ${organization} not found` });
      throw new Error(`Organization ${organization} not found`);
    }
    const matchQry = esb
      .requestBodySearch()
      .query(
        esb
          .boolQuery()
          .must([
            esb.termsQuery('body.id', `${mappingPrefixes.issue}_${issueId}`),
            esb.termQuery('body.organizationId', orgData.id),
          ])
      )
      .toJSON();
    const issueData = await esClientObj.search(Jira.Enums.IndexName.Issue, matchQry);
    const [formattedIssueData] = await searchedDataFormatorWithDeleted(issueData);
    return formattedIssueData;
  } catch (error: unknown) {
    logger.error({ ...reqCtx, message: 'getIssueById.error', error: `${error}` });
    throw error;
  }
}

export async function getReopenRateDataById(
  issueId: string,
  orgId: string,
  reqCtx?: Other.Type.RequestCtx
): Promise<Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody> {
  try {
    const matchQry = esb
      .requestBodySearch()
      .query(
        esb.boolQuery().must([
          // eslint-disable-next-line max-len
          esb.termsQuery('body.issueId', `${mappingPrefixes.issue}_${issueId}`),
          esb.termQuery('body.organizationId', orgId),
        ])
      )
      .toJSON();

    const reopenRateData = await esClientObj.search(Jira.Enums.IndexName.ReopenRate, matchQry);
    const [formattedIssueData] = await searchedDataFormatorWithDeleted(reopenRateData);
    return formattedIssueData;
  } catch (error: unknown) {
    logger.error({ ...reqCtx, message: 'getReopenRateDataById.error', error: `${error} ` });
    throw error;
  }
}

export async function getReopenRateDataByIssueId(
  issueId: string,
  organization: string,
  reqCtx: Other.Type.RequestCtx
): Promise<Pick<Other.Type.Hit, '_id'>[] & Other.Type.HitBody> {
  try {
    const orgData = await getOrganization(organization);
    if (!orgData) {
      logger.error({ ...reqCtx, message: `Organization ${organization} not found` });
      throw new Error(`Organization ${organization} not found`);
    }
    const matchQry = esb
      .requestBodySearch()
      .query(
        esb
          .boolQuery()
          .must([
            esb.termsQuery('body.issueId', `${mappingPrefixes.issue}_${issueId}`),
            esb.termQuery('body.organizationId', orgData.id),
          ])
      )
      .toJSON();

    const reopenRateData = await esClientObj.search(Jira.Enums.IndexName.ReopenRate, matchQry);
    const formattedIssueData = await searchedDataFormatorWithDeleted(reopenRateData);
    return formattedIssueData;
  } catch (error: unknown) {
    logger.error({ ...reqCtx, message: 'getReopenRateDataByIssueId.error', error });
    throw error;
  }
}

export async function updateIssueWithSubtask(
  id: string,
  subtasks: Array<{
    id: string;
    key: string;
    self: string;
    fields: { summary: string; status: string; issuetype: string; priority: string };
  }>
): Promise<void> {
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, id, {
    body: { subtasks },
  });
}

export async function getIssuesById(
  issueId: string[],
  organization: string,
  reqCtx: Other.Type.RequestCtx
): Promise<(Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[] | []> {
  try {
    const orgData = await getOrganization(organization);
    if (!orgData) {
      logger.error({ ...reqCtx, message: `Organization ${organization} not found` });
      throw new Error(`Organization ${organization} not found`);
    }
    const matchQry = esb
      .requestBodySearch()
      .query(
        esb.boolQuery().must([
          esb.termsQuery(
            'body.id',
            issueId.map((id) => `${mappingPrefixes.issue}_${id}`)
          ),
          esb.termQuery('body.organizationId', orgData.id),
        ])
      )
      .toJSON();
    const issueData = await esClientObj.search(Jira.Enums.IndexName.Issue, matchQry);
    const formattedIssueData = await searchedDataFormatorWithDeleted(issueData);
    return formattedIssueData;
  } catch (error: unknown) {
    logger.error({ ...reqCtx, message: 'getIssueById.error', error });
    throw error;
  }
}

export async function getCycleTimeByIssueId(
  issueId: string,
  orgId: string
): Promise<Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody> {
  try {
    const matchQry = esb
      .requestBodySearch()
      .query(
        esb
          .boolQuery()
          .must([
            esb.termsQuery('body.id', `${mappingPrefixes.issue}_${issueId}`),
            esb.termQuery('body.organizationId', orgId),
          ])
      )
      .toJSON();
    const issueData = await esClientObj.search(Jira.Enums.IndexName.CycleTime, matchQry);
    const [formattedIssueData] = await searchedDataFormatorWithDeleted(issueData);
    return formattedIssueData;
  } catch (error: unknown) {
    logger.error({ message: 'getIssueById.error', error: `${error}` });
    throw error;
  }
}

export async function getIssueParentChildIssues(
  parentId: string,
  childId: string,
  organization: string,
  reqCtx: Other.Type.RequestCtx
): Promise<Pick<Other.Type.Hit, '_id'>[] & Other.Type.HitBody> {
  const orgData = await getOrganization(organization);
  if (!orgData) {
    logger.error({ ...reqCtx, message: `Organization ${organization} not found` });
    throw new Error(`Organization ${organization} not found`);
  }
  const matchQry = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery('body.id', [
            `${mappingPrefixes.issue}_${parentId}`,
            `${mappingPrefixes.issue}_${childId}`,
          ]),
          esb.termQuery('body.organizationId', orgData.id),
          esb.termQuery('body.isDeleted', false),
        ])
    )
    .toJSON();
  const issueData = await esClientObj.search(Jira.Enums.IndexName.Issue, matchQry);
  const formattedIssueData = await searchedDataFormatorWithDeleted(issueData);
  logger.info({ message: 'getIssueParentChildIssues', data: formattedIssueData });
  if (!formattedIssueData) {
    logger.error({
      message: 'issueLinkHandler.issueDataNotFound',
      data: { issueData, reqCtx },
    });
    throw new Error(`issueData not found_for_parent:${parentId}_child:${childId}`);
  }
  return formattedIssueData;
}
