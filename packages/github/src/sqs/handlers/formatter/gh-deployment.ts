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

        return {
          _id: generateUuid(),
          body: {
            id: `${mappingPrefixes.gh_deployment}_${mappingPrefixes.organization}_${parser.orgId}_${mappingPrefixes.repo}_${parser.repoId}_${
              parser.destination
            }_${parser.createdAt.split('T')[0]}`,
            source: parser.source,
            destination: parser.destination,
            repoId: `${mappingPrefixes.repo}_${parser.repoId}`,
            orgId: `${mappingPrefixes.organization}_${parser.orgId}`,
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
