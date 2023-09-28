import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';

const indices = [
  {
    name: Jira.Enums.IndexName.Organization,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            id: { type: 'keyword' },
            organizationId: { type: 'keyword' },
            organizationName: { type: 'text' },
          },
        },
      },
    },
  },
  {
    name: Jira.Enums.IndexName.Users,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'keyword' },
            emailAddress: { type: 'keyword' },
            userName: { type: 'text' },
            displayName: { type: 'text' },
            avatarUrls: {
              properties: {
                avatarUrl48x48: { type: 'text' },
                avatarUrl32x32: { type: 'text' },
                avatarUrl24x24: { type: 'text' },
                avatarUrl16x16: { type: 'text' },
              },
            },
            isActive: { type: 'boolean' },
            isDelete: { type: 'boolean' },
            deletedAt: { type: 'date', format: 'strict_date_optional_time' },
            createdAt: { type: 'date', format: 'strict_date_optional_time' },
            organizationId: { type: 'keyword' },
          },
        },
      },
    },
  },

  {
    name: Jira.Enums.IndexName.Project,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            id: { type: 'keyword' },
            projectId: { type: 'keyword' },
            projectKey: { type: 'keyword' },
            name: { type: 'text' },
            avatarUrls: {
              properties: {
                avatarUrl48x48: { type: 'text' },
                avatarUrl32x32: { type: 'text' },
                avatarUrl24x24: { type: 'text' },
                avatarUrl16x16: { type: 'text' },
              },
            },
            projectTypeKey: { type: 'keyword' },
            projectType: { type: 'text' },
            lead: {
              properties: {
                accountId: { type: 'keyword' },
                displayName: { type: 'text' },
                avatarUrls: {
                  properties: {
                    avatarUrl48x48: { type: 'text' },
                    avatarUrl32x32: { type: 'text' },
                    avatarUrl24x24: { type: 'text' },
                    avatarUrl16x16: { type: 'text' },
                  },
                },
                active: { type: 'boolean' },
              },
            },
            category: {
              properties: {
                categoryId: { type: 'keyword' },
                name: { type: 'text' },
              },
            },
            organizationId: { type: 'keyword' },
            isDeleted: { type: 'boolean' },
            deletedAt: { type: 'date', format: 'strict_date_optional_time' },
            updatedAt: { type: 'date', format: 'strict_date_optional_time' },
          },
        },
      },
    },
  },
  {
    name: Jira.Enums.IndexName.Sprint,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            id: { type: 'keyword' },
            jiraSprintId: { type: 'keyword' },
            projectKey: { type: 'keyword' },
            self: { type: 'text' },
            name: { type: 'keyword' },
            state: { type: 'text' },
            startDate: { type: 'date' },
            endDate: { type: 'date' },
            completeDate: { type: 'date' },
            isDelete: { type: 'boolean' },
            deletedAt: { type: 'date' },
            projectId: { type: 'keyword' },
            organizationID: { type: 'keyword' },
            createdDate: { type: 'date' },
          },
        },
      },
    },
  },

  {
    name: Jira.Enums.IndexName.Issue,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            id: { type: 'keyword' },
            jiraIssueId: { type: 'keyword' },
            issueKey: { type: 'keyword' },
            project: { type: 'text' },
            projectKey: { type: 'keyword' },
            isFTP: { type: 'text' },
            reOpenCount: { type: 'integer' },
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
                statusChangedOn: { type: 'date', format: 'strict_date_optional_time' },
              },
            },
            sprint: {
              properties: {
                name: { type: 'keyword' },
                state: { type: 'keyword' },
                startDate: { type: 'date', format: 'strict_date_optional_time' },
                endDate: { type: 'date', format: 'strict_date_optional_time' },
              },
            },
            createdDate: { type: 'date', format: 'strict_date_optional_time' },
            lastViewed: { type: 'date', format: 'strict_date_optional_time' },
            lastUpdated: { type: 'date', format: 'strict_date_optional_time' },
            isDelete: { type: 'boolean' },
            deletedAt: { type: 'date', format: 'strict_date_optional_time' },
            sprintId: { type: 'keyword' },
            projectId: { type: 'keyword' },
            organizationID: { type: 'keyword' },
          },
        },
      },
    },
  },
  {
    name: Jira.Enums.IndexName.Board,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            id: { type: 'keyword' },
            boardId: { type: 'keyword' },
            self: { type: 'text' },
            name: { type: 'text' },
            type: { type: 'keyword' },
            createdAt: { type: 'date', format: 'strict_date_optional_time' },
            organizationId: { type: 'keyword' },
          },
        },
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

export async function createIndices(): Promise<void> {
  logger.info('Creating all indices...');

  await Promise.all(indices.map(async ({ name, mappings }) => createMapping(name, mappings)));

  logger.info('All indices created successfully');
}
