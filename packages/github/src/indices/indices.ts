import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';

const indices: any[] = [
  {
    name: Github.Enums.IndexName.GitUsers,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        id: { type: 'keyword' },
        githubUserId: { type: 'keyword' },
        userName: { type: 'keyword' },
        fullName: { type: 'text' },
        email: { type: 'keyword' },
        avatarUrl: { type: 'text' },
        type: { type: 'text' },
        createdAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        updatedAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        company: { type: 'text' },
        deletedAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        organizationId: { type: 'keyword' },
        action: {
          properties: {
            action: { type: 'keyword' },
            actionTime: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
            actionDay: { type: 'keyword' },
          },
        },
        createdAtDay: { type: 'keyword' },
        computationDate: { type: 'date', format: 'yyyy-MM-dd' },
        githubDate: { type: 'date', format: 'yyyy-MM-dd' },
      },
    },
  },
  {
    name: Github.Enums.IndexName.GitOrganization,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        id: { type: 'keyword' },
        githubOrganizationId: { type: 'keyword' },
        name: { type: 'text' },
        description: { type: 'text' },
        company: { type: 'text' },
        location: { type: 'text' },
        email: { type: 'text' },
        isVerified: { type: 'boolean' },
        hasOrganizationProjects: { type: 'boolean' },
        hasRepositoryProjects: { type: 'boolean' },
        publicRepos: { type: 'integer' },
        totalPrivateRepos: { type: 'integer' },
        createdAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        updatedAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        deletedAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
      },
    },
  },
  {
    name: Github.Enums.IndexName.GitRepo,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        id: { type: 'keyword' },
        githubRepoId: { type: 'keyword' },
        name: { type: 'text' },
        owner: { type: 'keyword' },
        description: { type: 'text' },
        isPrivate: { type: 'boolean' },
        createdAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        updatedAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        pushedAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        visibility: { type: 'text' },
        openIssuesCount: { type: 'integer' },
        topics: { type: 'text' },
        organizationId: { type: 'keyword' },
        deletedAt: { type: 'date' },
        action: {
          properties: {
            action: { type: 'keyword' },
            actionTime: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
            actionDay: { type: 'keyword' },
          },
        },
        createdAtDay: { type: 'keyword' },
        computationDate: { type: 'date', format: 'yyyy-MM-dd' },
        githubDate: { type: 'date', format: 'yyyy-MM-dd' },
      },
    },
  },
  {
    name: Github.Enums.IndexName.GitBranch,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        id: { type: 'keyword' },
        githubBranchId: { type: 'keyword' },
        name: { type: 'text' },
        createdAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        updatedAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        pushedAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        repoId: { type: 'keyword' },
        organizationId: { type: 'keyword' },
        deletedAt: { type: 'date' },
        action: {
          properties: {
            action: { type: 'keyword' },
            actionTime: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
            actionDay: { type: 'keyword' },
          },
        },
        createdAtDay: { type: 'keyword' },
        computationDate: { type: 'date', format: 'yyyy-MM-dd' },
        githubDate: { type: 'date', format: 'yyyy-MM-dd' },
      },
    },
  },
  {
    name: Github.Enums.IndexName.GitCommits,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        id: { type: 'keyword' },
        githubCommitId: { type: 'keyword' },
        message: { type: 'text' },
        authorId: { type: 'keyword' },
        committedAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
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
        action: {
          properties: {
            action: { type: 'keyword' },
            actionTime: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
            actionDay: { type: 'keyword' },
          },
        },
        createdAtDay: { type: 'keyword' },
        computationDate: { type: 'date', format: 'yyyy-MM-dd' },
        githubDate: { type: 'date', format: 'yyyy-MM-dd' },
      },
    },
  },
  {
    name: Github.Enums.IndexName.GitPush,
    _id: { type: 'uuid' },
    body: {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          githubPushId: { type: 'keyword' },
          pusherId: { type: 'keyword' },
          ref: { type: 'text' },
          commits: {
            properties: {
              commitId: { type: 'keyword' },
            },
          },
          organizationId: { type: 'keyword' },
          action: {
            properties: {
              action: { type: 'keyword' },
              actionTime: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
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
  {
    name: Github.Enums.IndexName.GitPull,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        id: { type: 'keyword' },
        githubPullId: { type: 'keyword' },
        pullNumber: { type: 'keyword' },
        state: { type: 'text' },
        title: { type: 'text' },
        pRCreatedBy: { type: 'text' },
        pullBody: { type: 'text' },
        createdAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        updatedAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        closedAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        mergedAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        requestedReviewers: {
          properties: {
            login: { type: 'text' },
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
        mergedBy: { type: 'text' },
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
            actionTime: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
            actionDay: { type: 'keyword' },
          },
        },
        createdAtDay: { type: 'keyword' },
        computationDate: { type: 'date', format: 'yyyy-MM-dd' },
        githubDate: { type: 'date', format: 'yyyy-MM-dd' },
      },
    },
  },
  {
    name: Github.Enums.IndexName.GitPRReviewComment,
    _id: { type: 'uuid' },
    mappings: {
      properties: {
        id: { type: 'keyword' },
        githubPRReviewCommentId: { type: 'keyword' },
        pRReviewId: { type: 'keyword' },
        diffHunk: { type: 'text' },
        path: { type: 'text' },
        commitId: { type: 'keyword' },
        commentedBy: { type: 'keyword' },
        commentBody: { type: 'text' },
        createdAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        updatedAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
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
            actionTime: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
            actionDay: { type: 'keyword' },
          },
        },
        createdAtDay: { type: 'keyword' },
        computationDate: { type: 'date', format: 'yyyy-MM-dd' },
        githubDate: { type: 'date', format: 'yyyy-MM-dd' },
      },
    },
  },
  {
    name: Github.Enums.IndexName.GitPRReview,
    _id: { type: 'uuid' },
    mappings: {
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
            actionTime: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
            actionDay: { type: 'keyword' },
          },
        },
        createdAtDay: { type: 'keyword' },
        computationDate: { type: 'date', format: 'yyyy-MM-dd' },
        githubDate: { type: 'date', format: 'yyyy-MM-dd' },
      },
    },
  },
];

export async function createAllIndices(): Promise<void> {
  // logger.info({
  //   message: 'ELASTICSEARCH_INIT_DETAILS',
  //   data: {
  //     host: Config.OPENSEARCH_NODE,
  //     password: Config.OPENSEARCH_PASSWORD,
  //     username: Config.OPENSEARCH_USERNAME,
  //   },
  // });
  const esClient = await new ElasticSearchClient({
    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
  }).getClient();
  for (const { name, mappings } of indices) {
    try {
      const { statusCode } = await esClient.indices.exists({ index: name });
      if (statusCode === 200) {
        logger.info(`Index '${name}' already exists.`);
        continue;
      }
      await esClient.indices.create({ index: name, body: { mappings } });
      logger.info(`Index '${name}' created.`);
    } catch (error) {
      logger.info(`Error creating index '${name}':`, error);
      throw new Error('INDEX_CREATING_ERROR');
    }
  }
}
