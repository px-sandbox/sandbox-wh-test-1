import client from './client';
import { logger } from '../logger';
import { indices } from './github-indices';

export async function createAllIndices(): Promise<void> {
  for (const { name, mappings } of indices) {
    try {
      const indexExists = await client.indices.exists({ index: name });
      if (indexExists) {
        logger.info(`Index '${name}' already exists.`);
        continue;
      }
      await client.indices.create({ index: name, body: { mappings } });
      logger.info(`Index '${name}' created.`);
    } catch (error) {
      logger.info(`Error creating index '${name}':`, error);
    }
  }
}
