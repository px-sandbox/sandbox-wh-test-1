import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { v4 as uuid } from 'uuid';

const esClient = ElasticSearchClient.getInstance();

export const handler = async function randomdd(event: { Records: any }) {
  try {
    const recordToInsert = event.Records.map((record: { body: any }) => {
      const parser=JSON.parse(record.body)
      return {
        source: parser.message.source, 
        destination: parser.message.destination,
        createAt: parser.message.createAt,
        repoId: parser.message.repoId,
        orgId: parser.message.orgId
      };
    });
        await esClient.putDocument(Github.Enums.IndexName.GitDeploymentFrequency, recordToInsert);
  } catch (error) {
    logger.error({
      message: `handler.error`,
      error: `${error}`,
    });
    throw error;
  }
};
