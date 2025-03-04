import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';

const indices = [
  {
    name: Github.Enums.IndexName.GitUsers,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            id: { type: 'keyword' },
            githubUserId: { type: 'keyword' },
            userName: { type: 'keyword' },
            fullName: { type: 'text' },
            email: { type: 'keyword' },
            avatarUrl: { type: 'text' },
            type: { type: 'text' },
            createdAt: { type: 'date', format: 'strict_date_optional_time' },
            updatedAt: { type: 'date', format: 'strict_date_optional_time' },
            company: { type: 'text' },
            deletedAt: { type: 'date', format: 'strict_date_optional_time' },
            organizationId: { type: 'keyword' },
            action: {
              properties: {
                action: { type: 'keyword' },
                actionTime: {
                  type: 'date',
                  format: 'strict_date_optional_time',
                },
                actionDay: { type: 'keyword' },
              },
            },
            createdAtDay: { type: 'keyword' },
            computationDate: { type: 'date', format: 'yyyy-MM-dd' },
            githubDate: { type: 'date', format: 'yyyy-MM-dd' },
            timezone: { type: 'keyword' },
            isDeleted: { type: 'boolean' },
          },
        },
      },
    },
  },
  {
    name: Github.Enums.IndexName.GitOrganization,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            id: { type: 'keyword' },
            githubOrganizationId: { type: 'keyword' },
            installationId: { type: 'long' },
            name: { type: 'text' },
            createdAt: { type: 'date', format: 'strict_date_optional_time' },
            updatedAt: { type: 'date', format: 'strict_date_optional_time' },
            deletedAt: { type: 'date', format: 'strict_date_optional_time' },
          },
        },
      },
    },
  },
  {
    name: Github.Enums.IndexName.GitRepo,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            id: { type: 'keyword' },
            githubRepoId: { type: 'keyword' },
            name: { type: 'text' },
            owner: { type: 'keyword' },
            description: { type: 'text' },
            isPrivate: { type: 'boolean' },
            createdAt: { type: 'date', format: 'strict_date_optional_time' },
            updatedAt: { type: 'date', format: 'strict_date_optional_time' },
            pushedAt: { type: 'date', format: 'strict_date_optional_time' },
            visibility: { type: 'text' },
            openIssuesCount: { type: 'integer' },
            topics: { type: 'text' },
            organizationId: { type: 'keyword' },
            deletedAt: { type: 'date' },
            action: {
              properties: {
                action: { type: 'keyword' },
                actionTime: {
                  type: 'date',
                  format: 'strict_date_optional_time',
                },
                actionDay: { type: 'keyword' },
              },
            },
            createdAtDay: { type: 'keyword' },
            computationDate: { type: 'date', format: 'yyyy-MM-dd' },
            githubDate: { type: 'date', format: 'yyyy-MM-dd' },
            isDeleted: { type: 'boolean' },
          },
        },
      },
    },
  },
  {
    name: Github.Enums.IndexName.GitBranch,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            id: { type: 'keyword' },
            githubBranchId: { type: 'keyword' },
            name: { type: 'text' },
            createdAt: { type: 'date', format: 'strict_date_optional_time' },
            updatedAt: { type: 'date', format: 'strict_date_optional_time' },
            pushedAt: { type: 'date', format: 'strict_date_optional_time' },
            repoId: { type: 'keyword' },
            organizationId: { type: 'keyword' },
            deletedAt: { type: 'date', format: 'strict_date_optional_time' },
            isDeleted: { type: 'boolean' },
            action: {
              properties: {
                action: { type: 'keyword' },
                actionTime: {
                  type: 'date',
                  format: 'strict_date_optional_time',
                },
                actionDay: { type: 'keyword' },
              },
            },
            createdAtDay: { type: 'keyword' },
            computationDate: { type: 'date', format: 'yyyy-MM-dd' },
            githubDate: { type: 'date', format: 'yyyy-MM-dd' },
          },
        },
      },
    },
  },
  {
    name: Github.Enums.IndexName.GitCommits,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            id: { type: 'keyword' },
            githubCommitId: { type: 'keyword' },
            isMergedCommit: { type: 'boolean' },
            pushedBranch: { type: 'text' },
            mergedBranch: { type: 'text' },
            message: { type: 'text' },
            authorId: { type: 'keyword' },
            committedAt: { type: 'date', format: 'strict_date_optional_time' },
            changes: {
              properties: {
                filename: { type: 'text' },
                additions: { type: 'integer' },
                deletions: { type: 'integer' },
                changes: { type: 'integer' },
                status: { type: 'text' },
              },
            },
            totalChanges: { type: 'integer' },
            repoId: { type: 'keyword' },
            organizationId: { type: 'keyword' },
            pushEventId: { type: 'keyword' },
            deletedAt: { type: 'date' },
            createdAtDay: { type: 'keyword' },
            computationDate: { type: 'date', format: 'yyyy-MM-dd' },
            githubDate: { type: 'date', format: 'yyyy-MM-dd' },
          },
        },
      },
    },
  },
  {
    name: Github.Enums.IndexName.GitPush,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            id: { type: 'keyword' },
            githubPushId: { type: 'keyword' },
            pusherId: { type: 'keyword' },
            ref: { type: 'text' },
            commits: {
              type: 'keyword',
            },
            organizationId: { type: 'keyword' },
            action: {
              properties: {
                action: { type: 'keyword' },
                actionTime: {
                  type: 'date',
                  format: 'strict_date_optional_time',
                },
                actionDay: { type: 'keyword' },
              },
            },
            createdAt: { type: 'date', format: 'strict_date_optional_time' },
            createdAtDay: { type: 'keyword' },
            computationDate: { type: 'date', format: 'yyyy-MM-dd' },
            githubDate: { type: 'date', format: 'yyyy-MM-dd' },
          },
        },
      },
    },
  },
  {
    name: Github.Enums.IndexName.GitPull,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            id: { type: 'keyword' },
            githubPullId: { type: 'keyword' },
            pullNumber: { type: 'keyword' },
            state: { type: 'text' },
            title: { type: 'text' },
            pRCreatedBy: { type: 'text' },
            pullBody: { type: 'text' },
            createdAt: { type: 'date', format: 'strict_date_optional_time' },
            updatedAt: { type: 'date', format: 'strict_date_optional_time' },
            closedAt: { type: 'date', format: 'strict_date_optional_time' },
            mergedAt: { type: 'date', format: 'strict_date_optional_time' },
            reviewedAt: { type: 'date', format: 'strict_date_optional_time' },
            approvedAt: { type: 'date', format: 'strict_date_optional_time' },
            reviewTime: { type: 'integer' },
            requestedReviewers: {
              properties: {
                userId: { type: 'keyword' },
              },
            },
            labels: {
              properties: {
                name: { type: 'text' },
              },
            },
            head: {
              properties: {
                label: { type: 'text' },
                ref: { type: 'text' },
              },
            },
            base: {
              properties: {
                label: { type: 'text' },
                ref: { type: 'text' },
              },
            },
            mergedBy: {
              properties: {
                userId: { type: 'keyword' },
              },
            },
            merged: { type: 'boolean' },
            mergedCommitId: { type: 'keyword' },
            comments: { type: 'integer' },
            reviewComments: { type: 'integer' },
            commits: { type: 'integer' },
            additions: { type: 'integer' },
            deletions: { type: 'integer' },
            changedFiles: { type: 'integer' },
            repoId: { type: 'keyword' },
            organizationId: { type: 'keyword' },
            action: {
              properties: {
                action: { type: 'keyword' },
                actionTime: {
                  type: 'date',
                  format: 'strict_date_optional_time',
                },
                actionDay: { type: 'keyword' },
              },
            },
            createdAtDay: { type: 'keyword' },
            computationDate: { type: 'date', format: 'yyyy-MM-dd' },
            githubDate: { type: 'date', format: 'yyyy-MM-dd' },
          },
        },
      },
    },
  },
  {
    name: Github.Enums.IndexName.GitPRReviewComment,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            id: { type: 'keyword' },
            githubPRReviewCommentId: { type: 'keyword' },
            pRReviewId: { type: 'keyword' },
            diffHunk: { type: 'text' },
            path: { type: 'text' },
            commitId: { type: 'keyword' },
            commentedBy: { type: 'keyword' },
            commentBody: { type: 'text' },
            createdAt: { type: 'date', format: 'strict_date_optional_time' },
            updatedAt: { type: 'date', format: 'strict_date_optional_time' },
            reactions: {
              properties: {
                totalCount: { type: 'integer' },
                '+1': { type: 'integer' },
                '-1': { type: 'integer' },
                laugh: { type: 'integer' },
                hooray: { type: 'integer' },
                confused: { type: 'integer' },
                heart: { type: 'integer' },
                rocket: { type: 'integer' },
                eyes: { type: 'integer' },
              },
            },
            pullId: { type: 'keyword' },
            repoId: { type: 'keyword' },
            organizationId: { type: 'keyword' },
            action: {
              properties: {
                action: { type: 'keyword' },
                actionTime: {
                  type: 'date',
                  format: 'strict_date_optional_time',
                },
                actionDay: { type: 'keyword' },
              },
            },
            createdAtDay: { type: 'keyword' },
            computationDate: { type: 'date', format: 'yyyy-MM-dd' },
            githubDate: { type: 'date', format: 'yyyy-MM-dd' },
            isDeleted: { type: 'boolean' },
          },
        },
      },
    },
  },
  {
    name: Github.Enums.IndexName.GitPRReview,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            id: { type: 'keyword' },
            githubPRReviewId: { type: 'keyword' },
            commitId: { type: 'keyword' },
            reviewedBy: { type: 'keyword' },
            reviewBody: { type: 'text' },
            submittedAt: { type: 'text' },
            state: { type: 'text' },
            pullId: { type: 'keyword' },
            repoId: { type: 'keyword' },
            organizationId: { type: 'keyword' },
            action: {
              properties: {
                action: { type: 'keyword' },
                actionTime: {
                  type: 'date',
                  format: 'strict_date_optional_time',
                },
                actionDay: { type: 'keyword' },
              },
            },
            createdAtDay: { type: 'keyword' },
            computationDate: { type: 'date', format: 'yyyy-MM-dd' },
            githubDate: { type: 'date', format: 'yyyy-MM-dd' },
          },
        },
      },
    },
  },

  {
    name: Github.Enums.IndexName.GitActiveBranches,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            id: { type: 'keyword' },
            repoId: { type: 'keyword' },
            organizationId: { type: 'keyword' },
            branchesCount: { type: 'integer' },
            createdAt: { type: 'date', format: 'strict_date_optional_time' },
          },
        },
      },
    },
  },
  {
    name: Github.Enums.IndexName.GitRepoLibrary,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            repoId: { type: 'keyword' },
            organizationId: { type: 'keyword' },
            name: { type: 'keyword' },
            libName: { type: 'keyword' },
            version: { type: 'keyword' },
            releaseDate: { type: 'date', format: 'strict_date_optional_time' },
            isDeleted: { type: 'boolean' },
            isCore: { type: 'boolean' },
            isDeprecated: { type: 'boolean' },
          },
        },
      },
    },
  },
  {
    name: Github.Enums.IndexName.GitRepoSastErrors,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            errorMsg: { type: 'keyword' },
            ruleId: { type: 'keyword' },
            repoId: { type: 'keyword' },
            organizationId: { type: 'keyword' },
            fileName: { type: 'keyword' },
            lineNumber: { type: 'integer' },
            codeSnippet: { type: 'text' },
            date: { type: 'date', format: 'strict_date_optional_time' },
            createdAt: { type: 'date', format: 'strict_date_optional_time' },
            isDeleted: { type: 'boolean' },
            deletedAt: { type: 'date', format: 'strict_date_optional_time' },
            metadata: {
              type: 'nested',
              properties: {
                branch: { type: 'keyword' },
                firstReportedOn: { type: 'date', format: 'strict_date_optional_time' },
                lastReportedOn: { type: 'date', format: 'strict_date_optional_time' },
                isResolved: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  },
  {
    name: Github.Enums.IndexName.GitDeploymentFrequency,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            source: { type: 'keyword' },
            destination: { type: 'keyword' },
            createdAt: { type: 'date', format: 'strict_date_optional_time' },
            repoId: { type: 'keyword' },
            orgId: { type: 'keyword' },
            env: { type: 'keyword' },
            date: { type: 'date', format: 'yyyy-MM-dd' },
          },
        },
      },
    },
  },
  {
    name: Github.Enums.IndexName.GitRepoSastErrorCount,
    _id: { type: 'keyword' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            repoId: { type: 'keyword' },
            organizationId: { type: 'keyword' },
            date: { type: 'date', format: 'strict_date_optional_time' },
            branch: { type: 'keyword' },
            count: { type: 'integer' },
          },
        },
      },
    },
  },
  {
    name: Github.Enums.IndexName.GitMigrationStatus,
    _id: { type: 'keyword' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            organizationId: { type: 'keyword' },
            statusLogs: {
              type: 'nested',
              properties: {
                status: { type: 'keyword' },
                date: { type: 'date', format: 'strict_date_optional_time' },
              },
            },
          },
        },
      },
    },
  },
  {
    name: Github.Enums.IndexName.GitTestCoverage,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        body: {
          type: 'object',
          properties: {
            id: { type: 'keyword' },
            organizationId: {
              type: 'keyword',
            },
            repoId: {
              type: 'keyword',
            },
            createdAt: {
              type: 'date',
              format: 'strict_date_optional_time',
            },
            forDate: {
              type: 'date',
              format: 'strict_date_optional_time',
            },
            statements: {
              type: 'object',
              properties: {
                covered: {
                  type: 'integer',
                },
                skipped: {
                  type: 'integer',
                },
                total: {
                  type: 'integer',
                },
                percent: {
                  type: 'float',
                },
              },
            },
            functions: {
              type: 'object',
              properties: {
                covered: {
                  type: 'integer',
                },
                skipped: {
                  type: 'integer',
                },
                total: {
                  type: 'integer',
                },
                percent: {
                  type: 'float',
                },
              },
            },
            branches: {
              type: 'object',
              properties: {
                covered: {
                  type: 'integer',
                },
                skipped: {
                  type: 'integer',
                },
                total: {
                  type: 'integer',
                },
                percent: {
                  type: 'float',
                },
              },
            },
            cron: { type: 'boolean' },
          },
        },
      },
    },
  },
];

async function createMapping(name: string, mappings: Github.Type.IndexMapping): Promise<void> {
  try {
    const esClient = ElasticSearchClient.getInstance();

    const { statusCode } = await esClient.isIndexExists(name);
    if (statusCode === 200) 
      logger.info({ message: `GithubIndices.info Index '${name}' already exists.` });
      // update
      await esClient.updateIndex(name, mappings);
      return;
    }

    logger.info({ message: `GithubIndices.info Creating mapping for index '${name}'...` });

    await esClient.createIndex(name, mappings);

    logger.info({ message: `GithubIndices.info Created mapping for '${name}' successful` });
  } catch (error) {
    logger.error({ message: `GithubIndices.error creating mapping for '${name}':`, error });
    throw error;
  }
}

export async function createAllIndices(): Promise<void> {
  logger.info({ message: 'GithubIndices.info Creating all indices...' });

  await Promise.all(indices.map(async ({ name, mappings }) => createMapping(name, mappings)));

  logger.info({ message: 'GithubIndices.info All indices created successfully' });
}
