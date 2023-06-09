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
        organizationId: { type: 'keyword' },
        deletedAt: { type: 'date' },
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
        number: { type: 'keyword' },
        state: { type: 'text' },
        title: { type: 'text' },
        pullRequestCreatedBy: { type: 'text' },
        body: { type: 'text' },
        createdAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        updatedAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        closedAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        mergedAt: { type: 'date', format: 'yyyy-MM-dd HH:mm:ss' },
        repoId: { type: 'keyword' },
        organizationId: { type: 'keyword' },
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
    }
  }
}
// requestedReviewers: {
//   properties: {
//     login: { type: 'keyword' },
//   },
// },
// labels: {
//   properties: {
//     name: { type: 'keyword' },
//   },
// },
// head: {
//   properties: {
//     label: { type: 'text' },
//     ref: { type: 'text' },
//   },
// },
// base: {
//   properties: {
//     label: { type: 'text' },
//     ref: { type: 'text' },
//   },
// },
// mergedBy: { type: 'text' },
// comments: { type: 'integer' },
// reviewComments: { type: 'integer' },
// commits: { type: 'integer' },
// additions: { type: 'integer' },
// deletions: { type: 'integer' },
// changedFiles: { type: 'integer' },
