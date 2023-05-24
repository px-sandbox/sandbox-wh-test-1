import { ElasticSearchClient } from '@pulse/elasticsearch';
import { logger } from 'core';
import { Github } from 'abstraction';

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
];

export async function createAllIndices(): Promise<void> {
  for (const { name, mappings } of indices) {
    try {
      const indexExists = await new ElasticSearchClient()
        .getClient()
        .indices.exists({ index: name });
      if (indexExists) {
        logger.info(`Index '${name}' already exists.`);
        continue;
      }
      await new ElasticSearchClient()
        .getClient()
        .indices.create({ index: name, body: { mappings } });
      logger.info(`Index '${name}' created.`);
    } catch (error) {
      logger.info(`Error creating index '${name}':`, error);
    }
  }
}
