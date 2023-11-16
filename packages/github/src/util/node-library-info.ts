import { logger } from "core";
import axios from "axios";
import { LibInfo } from "abstraction/github/type";

export async function getNodeLibInfo(libName: string, currentVersion?: string): Promise<LibInfo> {
    const npmPackageUrl = `https://registry.npmjs.org/${libName}`;
    try {
        logger.info('get-library-info.invoked', { libName });
        const { data } = await axios.get(npmPackageUrl);
        const versionArray = Object.keys(data.time);
        const latestVersion = versionArray[versionArray.length - 1];

        return {
            name: data.name,
            latest: {
                version: latestVersion,
                releaseDate: data.time[latestVersion],
            },
            current: {
                version: currentVersion ?? latestVersion,
                releaseDate: data.time[currentVersion ?? latestVersion],
            }
        }
    } catch (error) {
        logger.error('get-library-info.error', { errorInfo: JSON.stringify(error) });
        throw error;
    }
}
