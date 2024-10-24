import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { generateUuid } from 'src/util/response-formatter';
import { mappingPrefixes } from 'src/constant/config';

const esClient = ElasticSearchClient.getInstance();

export const handler = async function insertDeploymentFrequencyData(event: { Records: any }) {
  await Promise.all(
    event.Records.map(async (record: { body: any }) => {
      try {
        const parser = JSON.parse(record.body);
        const records = {
          id: generateUuid(),
          body: {
            id: `${mappingPrefixes.gh_deployment}_${parser.message.orgId}_${parser.message.repoId}_${parser.message.destination}_${parser.message.createAt}`,
            source: parser.message.source,
            destination: parser.message.destination,
            repoId: parser.message.repoId,
            orgId: parser.message.orgId,
            createdAt: parser.message.createAt,
            env: parser.message.env,
          },
        };
       await esClient.putDocument(Github.Enums.IndexName.GitDeploymentFrequency, records);
      } catch (error) {
        logger.error({
          message: `insertDeploymentFrequencyData.handler.error`,
          error: `${error}`,
        });
        throw error;
      }
    })
  );
};
