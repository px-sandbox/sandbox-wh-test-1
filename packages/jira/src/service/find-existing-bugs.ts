/* eslint-disable max-lines-per-function */
/* eslint-disable no-await-in-loop */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Jira, Other } from 'abstraction';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { Queue } from 'sst/node/queue';
import { mappingPrefixes } from '../constant/config';
import { getOrganizationById } from '../repository/organization/get-organization';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();
const sqsClient = SQSClient.getInstance();

export const handler = async function getIssuesList(
  event: APIGatewayProxyEvent
): Promise<Other.Type.HitBody> {
  let libFormatData;

  try {
    const size = 100;
    let from = 0;

    const jiraOrgId = `${mappingPrefixes.organization}_${event?.queryStringParameters?.orgId}`;
    const projectId = event?.queryStringParameters?.projectId;
    const orgData = await getOrganizationById(jiraOrgId);

    do {
      libFormatData = [];
      const getBugsQuery = esb
        .requestBodySearch()
        .size(size)
        .from(from)
        .query(
          esb
            .boolQuery()
            .must([
              esb.termQuery('body.issueType', Jira.Enums.IssuesTypes.BUG),
              esb.termQuery('body.organizationId.keyword', jiraOrgId),
              esb.termQuery('body.projectId', projectId),
              esb.termQuery('body.isDeleted', false),
            ])
        )
        .sort(esb.sort('body.issueId', 'desc'))
        .toJSON();

      const esLibData = await esClientObj.search(Jira.Enums.IndexName.Issue, getBugsQuery);

      libFormatData = await searchedDataFormator(esLibData);
      logger.info('issue.migrate', {
        issues: libFormatData.map((l) => l.issueKey).join(','),
        from,
      });

      from += size;

      await Promise.all(
        libFormatData.map((bug) => {
          const formattedBug = {
            issue: {
              id: bug.issueId,
              key: bug.issueKey,
              fields: {
                project: {
                  id: bug.projectId,
                  key: bug.projectKey,
                },
              },
            },
            bugId: bug.issueId,
            organization: orgData,
            sprintId: bug && bug.sprintId ? bug.sprintId.split('jira_sprint_')[1] : null,
            boardId: bug.boardId,
          };
          return sqsClient.sendMessage(formattedBug, Queue.qReOpenRateMigrator.queueUrl);
        })
      );
    } while (libFormatData.length === size);

    return responseParser
      .setBody({ message: 'Existing bugs fetched successfully for reopen' })
      .setMessage('Existing bugs fetched successfully for reopen')
      .setStatusCode(HttpStatusCode[200])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (error) {
    logger.error(`get existing bug for reopen error ${error}`);
    throw error;
  }
};
