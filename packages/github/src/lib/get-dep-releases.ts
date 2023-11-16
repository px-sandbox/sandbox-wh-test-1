import { OctokitResponse, RequestInterface } from '@octokit/types';
import { logger } from 'core';

async function getReleaseList(
    octokit: RequestInterface<
        object & {
            headers: {
                authorization: string | undefined;
            };
        }
    >,
    owner: string,
    repo: string,
    page = 1,
): Promise<number> {
    try {
        const perPage = 100;
        const responseData = await octokit(
            `GET /repos/${owner}/${repo}/releases?per_page=${perPage}&page=${page}`
        );
        const releasesPerPage = responseData.data as Array<OctokitResponse<string>>;
        if (releasesPerPage.length < perPage) {
            logger.info('getReleaseList.successfull');
            return;
        }
        return getReleaseList(octokit, owner, repo, page + 1);

    } catch (error: any) {
        logger.error('getReposList.error', {
            repo,
            owner,
            error,
            page,
        });
        throw error;
    }
}

export async function getReleases(
    octokit: RequestInterface<
        object & {
            headers: {
                authorization: string | undefined;
            };
        }
    >,
    owner: string,
    repo: string,
): Promise<number> {
    try {
        const releaseData = await getReleaseList(octokit, owner, repo);
        return releaseData;
    } catch (error: unknown) {
        logger.error({
            error,
        });
        throw error;
    }
}
