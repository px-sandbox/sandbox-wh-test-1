import { logger } from 'core';
import axios from 'axios';
import { LibInfo } from 'abstraction/github/type';
import _ from 'lodash';

export async function getNodeLibInfo(libName: string, currentVersion: string): Promise<LibInfo> {
    const npmPackageUrl = `https://registry.npmjs.org/${libName}`;
    let latestVersion: string;
    try {
        logger.info({ message: 'get-library-info.invoked', data: libName });
        const { data } = await axios.get(npmPackageUrl);

        if (data['dist-tags'] && data['dist-tags'].latest) {
            latestVersion = data['dist-tags'].latest;
        } else {
            const filteredDataTime = _.omit(data.time, ['modified', 'created']);
            [latestVersion] = _.sortBy(Object.keys(filteredDataTime)).reverse();
        }

        return {
            name: data.name,
            latest: {
                version: latestVersion,
                releaseDate: data.time[latestVersion],
            },
            current: {
                version: currentVersion,
                releaseDate: data.time[currentVersion],
            },
        };
    } catch (error) {
        logger.error({ message: 'get-library-info.error', error });
        throw error;
    }
}
