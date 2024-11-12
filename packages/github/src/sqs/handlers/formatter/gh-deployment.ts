import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { generateUuid } from 'src/util/response-formatter';
import { mappingPrefixes } from 'src/constant/config';
import { SQSEvent } from 'aws-lambda';
const esClient = ElasticSearchClient.getInstance();

export const handler = async function insertDeploymentFrequencyData(event: SQSEvent) {
  try {
    const bulkOperations = await Promise.all(
      event.Records.map(async (record) => {
        const { message: parser } = JSON.parse(record.body);
        const repoId = `${mappingPrefixes.repo}_${parser.repoId}`;
        const orgId = `${mappingPrefixes.organization}_${parser.orgId}`;
        const coverageId = `${mappingPrefixes.gh_deployment}_${orgId}_${repoId}_${parser.destination}_${
          parser.createdAt.split('T')[0]
        }`;
        return {
          _id: generateUuid(),
          body: {
            id: coverageId,
            source: parser.source,
            destination: parser.destination,
            repoId,
            orgId,
            createdAt: parser.createdAt,
            env: parser.env,
            date: parser.createdAt.split('T')[0],
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
