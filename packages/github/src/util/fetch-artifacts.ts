import axios from 'axios';
const AdmZip = require('adm-zip');
import { logger } from 'core';
import { getInstallationAccessToken } from './installation-access-token';

async function fetchArtifacts(orgName: string, artifactDownloadUrl: string): Promise<any> {
  try {
    const installationAccessToken = await getInstallationAccessToken(orgName);

    // Download the zip file with timeout
    const response = await axios.get<Buffer>(artifactDownloadUrl, {
      responseType: 'arraybuffer',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${installationAccessToken.body.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.data) {
      logger.warn({ message: 'Empty response received from artifact download' });
      return {};
    }

    // Process zip data directly from memory
    const zip = new AdmZip(response.data);
    const zipEntries = zip.getEntries();

    if (!zipEntries || zipEntries.length === 0) {
      logger.warn({ message: 'No entries found in zip file' });
      return {};
    }

    // Find the first JSON file
    const jsonEntry = zipEntries.find((entry: ZipEntry) => entry.entryName.endsWith('.json'));

    if (!jsonEntry) {
      logger.warn({ message: 'No JSON files found in zip' });
      return {};
    }

    const content = JSON.parse(jsonEntry.getData().toString('utf-8'));
    return content;
  } catch (error) {
    logger.error({ message: 'Error processing artifact', error: `${error}` });
    throw error;
  }
}

export { fetchArtifacts };
