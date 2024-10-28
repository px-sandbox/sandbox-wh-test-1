import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { generateUuid } from 'src/util/response-formatter';
import { mappingPrefixes } from 'src/constant/config';
import { SQSEvent } from 'aws-lambda';
const esClient = ElasticSearchClient.getInstance();

export const handler = async function insertDeploymentFrequencyData(event: SQSEvent) {
  try {
    const bulkOperations:Github.Type.DeploymentFreq[] = [];
    await Promise.all(
      event.Records.map(async (record) => {
        const parser = JSON.parse(record.body);
        const createdAt=parser.message.createdAt;
        const date=createdAt.split('T')[0]
        bulkOperations.push({
          _id: generateUuid(),
          body: {
            id: `${mappingPrefixes.gh_deployment}_${parser.message.orgId}_${parser.message.repoId}_${parser.message.destination}_${date}`,
            source: parser.message.source,
            destination: parser.message.destination,
            repoId: parser.message.repoId,
            orgId: parser.message.orgId,
            createdAt: createdAt,
            env: parser.message.env,
            date:date
          },
        });
      }));
    await esClient.bulkInsert(Github.Enums.IndexName.GitDeploymentFrequency, bulkOperations);
  }
  catch (error) {
    logger.error({
      message: `insertDeploymentFrequencyData.handler.error`,
      error: `${error}`,
    });
    throw error;
  }
}
