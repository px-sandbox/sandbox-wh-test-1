import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { v4 as uuid } from 'uuid';

const esClient = ElasticSearchClient.getInstance();

export const handler = async function randomdd(event: { Records: any }) {
  try {
    const recordToInsert = event.Records.map((record: { body: any }) => {
      return {
        body: JSON.parse(record.body).message,
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
