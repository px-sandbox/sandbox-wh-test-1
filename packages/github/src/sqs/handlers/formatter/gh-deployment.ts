import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { SQSEvent } from 'aws-lambda';
import esb from 'elastic-builder';
import { generateUuid, searchedDataFormator } from '../../../util/response-formatter';
import { mappingPrefixes } from '../../../constant/config';

const esClient = ElasticSearchClient.getInstance();

const getPrData = async (commitId: string): Promise<Github.Type.PullRequestBody[]> => {
  const query = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([esb.termQuery('body.mergedCommitId', commitId), esb.termQuery('body.merged', true)])
    )
    .toJSON();
  const prData = await esClient.search(Github.Enums.IndexName.GitPull, query);
  const formattedData: Github.Type.PullRequestBody[] = await searchedDataFormator(prData);
  return formattedData;
};

export const handler = async function insertDeploymentFrequencyData(
  event: SQSEvent
): Promise<void> {
  try {
    const bulkOperations = await Promise.all(
      event.Records.map(async (record) => {
        const { message: parser } = JSON.parse(record.body);
        const [prData] = await getPrData(`${mappingPrefixes.commit}_${parser.commitId}`);
        if (!prData) {
          logger.error({ message: 'Pull request data not found', data: JSON.stringify(parser) });
          throw new Error('Pull request data not found');
        }
        const coverageId = `${mappingPrefixes.gh_deployment}_${prData.organizationId}_${
          prData.repoId
        }_${prData.base.ref}_${parser.eventTime.split('T')[0]}`;
        return {
          _id: generateUuid(),
          body: {
            id: coverageId,
            source: prData.head.ref,
            destination: prData.base.ref,
            repoId: prData.repoId,
            orgId: prData.organizationId,
            createdAt: parser.eventTime,
            env: parser.environment,
            date: parser.eventTime.split('T')[0],
          },
        };
      })
    );
    await esClient.bulkInsert(Github.Enums.IndexName.GitDeploymentFrequency, bulkOperations);
  } catch (error) {
    logger.error({
      message: `insertDeploymentFrequencyData.handler.error`,
      error: `${error}`,
    });
    throw error;
  }
};
