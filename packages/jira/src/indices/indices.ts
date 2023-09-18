import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';

const indices = [
  {
    name: Jira.Enums.IndexName.JiraIssue,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        id: { type: 'keyword' },
        issueKey: { type: 'keyword' },
        issueId: { type: 'keyword' },
        project: { type: 'text' },
        projectKey: { type: 'keyword' },
        projectId: { type: 'keyword' },
        isFTP: { type: 'text' },
        issueType: { type: 'keyword' },
        isPrimary: { type: 'boolean' },
        priority: { type: 'boolean' },
        label: {
          properties: {
            levelKey: { type: 'keyword' },
          },
        },

        issuelinks: {
          properties: {
            issueKey: { type: 'keyword' },
          },
        },
        assignee: {
          properties: {
            assigneeId: { type: 'keyword' },
            name: { type: 'text' },
            isActive: { type: 'boolean' },
          },
        },
        reporter: {
          properties: {
            reporterId: { type: 'keyword' },
            name: { type: 'text' },
            isActive: { type: 'boolean' },
          },
        },
        creator: {
          properties: {
            creatorId: { type: 'keyword' },
            name: { type: 'text' },
            isActive: { type: 'boolean' },
          },
        },
        status: { type: 'keyword' },
        subtasks: {
          properties: {
            subtaskKey: { type: 'keyword' },
          },
        },
        transitionHistory: {
          properties: {
            statusChangedFrom: { type: 'text' },
            statusChangedTo: { type: 'text' },
            statusChangedOn: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
          },
        },
        sprint: {
          properties: {
            sprintId: { type: 'keyword' },
            name: { type: 'keyword' },
            state: { type: 'keyword' },
            startDate: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
            endDate: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
          },
        },
        createdDate: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        lastViewed: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        lastUpdated: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        organizationID: { type: 'keyword' },
        isDelete: { type: 'boolean' },
        deletedAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
      },
    },
  },
  {
    name: Jira.Enums.IndexName.JiraIssue,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        id: { type: 'keyword' },
        issueKey: { type: 'keyword' },
        issueId: { type: 'keyword' },
        project: { type: 'text' },
        projectKey: { type: 'keyword' },
        projectId: { type: 'keyword' },
        isFTP: { type: 'text' },
        issueType: { type: 'keyword' },
        isPrimary: { type: 'boolean' },
        priority: { type: 'boolean' },
        label: {
          properties: {
            levelKey: { type: 'keyword' },
          },
        },

        issuelinks: {
          properties: {
            issueKey: { type: 'keyword' },
          },
        },
        assignee: {
          properties: {
            assigneeId: { type: 'keyword' },
            name: { type: 'text' },
            isActive: { type: 'boolean' },
          },
        },
        reporter: {
          properties: {
            reporterId: { type: 'keyword' },
            name: { type: 'text' },
            isActive: { type: 'boolean' },
          },
        },
        creator: {
          properties: {
            creatorId: { type: 'keyword' },
            name: { type: 'text' },
            isActive: { type: 'boolean' },
          },
        },
        status: { type: 'keyword' },
        subtasks: {
          properties: {
            subtaskKey: { type: 'keyword' },
          },
        },
        transitionHistory: {
          properties: {
            statusChangedFrom: { type: 'text' },
            statusChangedTo: { type: 'text' },
            statusChangedOn: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
          },
        },
        sprint: {
          properties: {
            sprintId: { type: 'keyword' },
            name: { type: 'keyword' },
            state: { type: 'keyword' },
            startDate: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
            endDate: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
          },
        },
        createdDate: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        lastViewed: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        lastUpdated: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        organizationID: { type: 'keyword' },
        isDelete: { type: 'boolean' },
        deletedAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
      },
    },
  },
];
async function createMapping(name: string, mappings: unknown): Promise<void> {
  try {
    const esClient = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    }).getClient();

    const { statusCode } = await esClient.indices.exists({ index: name });
    if (statusCode === 200) {
      logger.info(`Index '${name}' already exists.`);
      return;
    }

    logger.info(`Creating mapping for index '${name}'...`);

    await esClient.indices.create({ index: name, body: { mappings } });

    logger.info(`Created mapping for '${name}' suuceeful`);
  } catch (error) {
    logger.error(`Error creating mapping for '${name}':`, error);
    throw error;
  }
}

export async function createAllJiraIndices(): Promise<void> {
  logger.info('Creating all indices...');

  await Promise.all(indices.map(async ({ name, mappings }) => createMapping(name, mappings)));

  logger.info('All indices created successfully');
}
