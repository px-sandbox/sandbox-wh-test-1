import { RequestInterface } from '@octokit/types';
import { Other } from 'abstraction';
import { logger } from 'core';

export async function processFileChanges<T>(
  files: Array<T>,
  filesLink: string | undefined,
  octokit: RequestInterface<
    object & {
      headers: {
        Authorization: string;
      };
    }
    >, 
  reqCntx: Other.Type.RequestCtx,
): Promise<Array<T>> {
  let nextFilesLink = filesLink;
  let filesChanges = files;
  try {
    if (!nextFilesLink) {
      return filesChanges;
    }
    const nextLinkRegex = /<([^>]+)>;\s*rel="next"/;
    const nextLinkMatch = nextFilesLink.match(nextLinkRegex);
    if (!nextLinkMatch) {
      return filesChanges;
    }
    const response = await octokit(`GET ${nextLinkMatch[1]}`);
    filesChanges = [...files, ...response.data.files];
    nextFilesLink = response.headers.link;
    return processFileChanges(filesChanges, nextFilesLink, octokit, reqCntx);
  } catch (error) {
    logger.error({ message: 'ERROR_IN_PROCESS_FILE_CHANGES_COMMIT', error, ...reqCntx });
    throw error;
  }
}
