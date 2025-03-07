import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { VersionStatus } from 'abstraction/jira/enums';
import { logger } from 'core';

/**
 * Saves the details of a Jira version to Elasticsearch.
 * @param versionId The ID of the version to be updated.
 * @param name The name of the version.
 * @param description The description of the version.
 * @param startDate The start date of the version.
 * @param releaseDate The release date of the version.
 */

const esClientObj = ElasticSearchClient.getInstance();

export async function updateVersionDetails(versionId: string, name: string, description: string, startDate: string, releaseDate: string, archived: boolean, overdue: boolean): Promise<void> {
    try {
        await esClientObj.updateDocument(Jira.Enums.IndexName.Version, versionId, {
            body: {
                name,
                description,
                startDate,
                releaseDate,
                archived,
                overdue,
            },
        });
        logger.info({ data: { versionId, name, description, startDate, releaseDate }, message: 'updateVersionDetails.successful' });
    } catch (error: unknown) {
        logger.error({
            data: versionId,
            message: 'updateVersionDetails.error',
            error,
        });
        throw error;
    }
}

export async function releaseVersion(versionId: string, releaseDate: string): Promise<void> {
    try {
        await esClientObj.updateDocument(Jira.Enums.IndexName.Version, versionId, {
            body: {
                releaseDate,
                released: true,
                status: VersionStatus.RELEASED,
            },
        });
        logger.info({ data: { versionId, releaseDate }, message: 'releaseVersion.successful' });
    } catch (error: unknown) {
        logger.error({
            data: versionId,
            message: 'releaseVersion.error',
            error,
        });
        throw error;
    }
}

export async function UnreleaseVersion(versionId: string): Promise<void> {
    try {
        await esClientObj.updateDocument(Jira.Enums.IndexName.Version, versionId, {
            body: {
                released: false,
                status: VersionStatus.UNRELEASED,
            },
        });
        logger.info({ data: { versionId }, message: 'UnreleaseVersion.successful' });
    } catch (error: unknown) {
        logger.error({
            data: versionId,
            message: 'UnreleaseVersion.error',
            error,
        });
        throw error;
    }
}

export async function deleteVersion(versionId: string): Promise<void> {
    try {
        await esClientObj.updateDocument(Jira.Enums.IndexName.Version, versionId, {
            body: {
                isDeleted: true,
                deletedAt: new Date().toISOString(),
            },
        });
        logger.info({ data: versionId, message: 'deleteVersion.successful' });
    } catch (error: unknown) {
        logger.error({
            data: versionId,
            message: 'deleteVersion.error',
            error,
        });
        throw error;
    }
}