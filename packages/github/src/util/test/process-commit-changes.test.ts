import { beforeEach, describe,expect, it, test } from "vitest";
import { Other } from 'abstraction';
import { RequestInterface, RequestParameters, OctokitResponse } from '@octokit/types';
import { processFileChanges } from "../process-commit-changes";

describe('processFileChanges', () => {
  const files = ["Hello", 2, "Well"];
  const filesLink = '<https://api.github.com/next?page=2>; rel="next"'; // Example link

  const mockOctokit: RequestInterface<
    object & {
      headers: {
        Authorization: string;
      };
    }
  > = Object.assign(
    async (options: RequestParameters & { method?: string }) => {
      // Mock response based on the URL requested
      if (options.url === 'https://api.github.com/next?page=2') {
        return {
          status: 200,
          url: options.url,
          headers: {
            link: '<https://api.github.com/next?page=3>; rel="next"', // Next link for pagination
          },
          data: {
            files: ["file1.txt", "file2.txt"], // Mocked file data
          },
        } as OctokitResponse<any>;
      }

      // Default response if not matching
      return {
        status: 200,
        url: options.url,
        headers: {},
        data: {
          files: [],
        },
      } as OctokitResponse<any>;
    },
    {
      // Correctly typing the defaults method
      defaults <O extends RequestParameters>(newDefaults: O): RequestInterface<object & { headers: { Authorization: string; }; }> {
        return mockOctokit; // Returning the same mock instance
      },
      endpoint: (options: any) => options, // A simple implementation for the endpoint method
    }
  );

  const reqCtx: Other.Type.RequestCtx = {
    requestId: 'test-request-id',
    resourceId: 'test-resource-id',
  };

  it('should return combined file changes', async () => {
    const result = await processFileChanges(files, filesLink, mockOctokit, reqCtx);
    expect(result).toEqual([...files, "file1.txt", "file2.txt"]); // Expected result after merging
  });
});
