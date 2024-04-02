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
            groups: {
              properties: {
                size: { type: 'integer' },
                items: { type: 'object' },
              },
            },
            applicationRoles: {
              properties: {
                size: { type: 'integer' },
                items: { type: 'object' },
              },
            },
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
            sprintId: { type: 'keyword' },
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
            issueId: { type: 'keyword' },
            issueKey: { type: 'keyword' },
            projectKey: { type: 'keyword' },
            isFTP: { type: 'boolean' },
            isFTF: { type: 'boolean' },
            reOpenCount: { type: 'integer' },
            issueType: { type: 'keyword' },
            isPrimary: { type: 'boolean' },
            priority: { type: 'keyword' },
            label: { type: 'keyword' },
            summary: { type: 'text' },
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
            changelog: {
              properties: {
                id: { type: 'keyword' },
                items: {
                  properties: {
                    field: { type: 'text' },
                    statusChangedFrom: { type: 'text' },
                    statusChangedTo: { type: 'text' },
                    statusChangedOn: { type: 'date', format: 'strict_date_optional_time' },
                  },
                },
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
            boardId: { type: 'keyword' },
            projectId: { type: 'keyword' },
            organizationID: { type: 'keyword' },
            timeTracker: {
              type: 'object',
              properties: {
                estimate: { type: 'long' },
                actual: { type: 'long' },
              },
            },
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
            projectId: { type: 'keyword' },
            projectKey: { type: 'keyword' },
            filter: {
              type: 'object',
              properties: {
                id: { type: 'keyword' },
                self: { type: 'text' },
              },
            },
            columnConfig: {
              type: 'object',
              properties: {
                columns: {
                  type: 'object',
                  properties: {
                    name: { type: 'text' },
                    statuses: {
                      type: 'object',
                      properties: {
                        id: { type: 'keyword' },
                        self: { type: 'text' },
                      },
                    },
                  },
                },
                constraintType: { type: 'keyword' },
              },
            },
            ranking: {
              type: 'object',
              properties: {
                rankCustomFieldId: { type: 'integer' },
              },
            },
            createdAt: { type: 'date', format: 'strict_date_optional_time' },
            isDeleted: { type: 'boolean' },
            deletedAt: { type: 'date', format: 'strict_date_optional_time' },
            organizationId: { type: 'keyword' },
          },
        },
      },
    },
  },
  {
    name: Jira.Enums.IndexName.IssueStatus,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            id: { type: 'keyword' },
            issueStatusId: { type: 'keyword' },
            name: { type: 'text' },
            status: { type: 'text' },
            organizationId: { type: 'keyword' },
            pxStatus: { type: 'keyword' },
          },
        },
      },
    },
  },

  {
    name: Jira.Enums.IndexName.ReopenRate,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            organizationId: { type: 'keyword' },
            issueId: { type: 'keyword' },
            projectId: { type: 'keyword' },
            sprintId: { type: 'keyword' },
            boardId: { type: 'keyword' },
            reOpenCount: { type: 'long' },
            isReOpen: { type: 'boolean' },
            isDeleted: { type: 'boolean' },
            deletedAt: { type: 'date', format: 'strict_date_optional_time' },
          },
        },
      },
    },
  },
];
/**
 * Creates a mapping for an index in Elasticsearch.
 *
 * @param name - The name of the index.
 * @param mappings - The mapping definition for the index.
 * @returns A promise that resolves when the mapping is created successfully.
 * @throws An error if there is an issue creating the mapping.
 */
async function createMapping(name: string, mappings: Jira.Type.IndexMapping): Promise<void> {
  try {
    const esClient = ElasticSearchClient.getInstance();

    const { statusCode } = await esClient.isIndexExists(name);
    if (statusCode === 200) {
      logger.info(`Index '${name}' already exists.`);
      await esClient.updateIndex(name, mappings);
      return;
    }

    logger.info(`Creating mapping for index '${name}'...`);

    await esClient.createIndex(name, mappings);

    logger.info(`Created mapping for '${name}' successful`);
  } catch (error) {
    logger.error(`Error creating mapping for '${name}':`, error);
    throw error;
  }
}

/**
 * Creates all indices.
 * @returns A Promise that resolves when all indices are created successfully.
 */
export async function createIndices(): Promise<void> {
  logger.info('Creating all indices...');

  await Promise.all(indices.map(async ({ name, mappings }) => createMapping(name, mappings)));

  logger.info('All indices created successfully');
}
