import { beforeAll, expect, it, test, vi } from 'vitest';
import moment from 'moment';
import { PushProcessor } from '../push';
import { mappingPrefixes } from '../../constant/config';
import { describe } from 'node:test';

export function generateuniqIds() {
  return '94cc22e3-824b-48d5-8df7-12a9c613596b';
}

const mockData = {
  id: '1234',
  pusherId: '45678',
  ref: 'refs/heads/dev',
  commits: [
    { id: '8548f6bd06bf775e7108a32931b047fab7d5678f' },
    { id: '9121de235fa408e7ef465cbae339c4c2d7750d74' },
    { id: 'd5685307a7060f253454b11f8721a3a537b0a6fa' },
  ],
  repoId: '654421631',
  orgId: '133865861',
};
beforeAll(() => {
  vi.setSystemTime('2021-09-01T00:00:00.000Z');
});
describe('PushProcessor', () => {
  it('should format the data correctly', async () => {
    const mockRequestId = mockData.id;
    const mockResourceId = '';
    const pushProcessor = new PushProcessor(mockData, mockRequestId, mockResourceId);
    // Mock parentId method
    pushProcessor.parentId = vi.fn().mockResolvedValue(generateuniqIds());
    // Mock calculateComputationalDate method
    await pushProcessor.format();
    const expectedFormattedData = {
      id: generateuniqIds(),
      body: {
        id: `${mappingPrefixes.push}_${mockData.id}`,
        githubPushId: `${mockData.id}`,
        pusherId: `${mappingPrefixes.user}_${mockData.pusherId}`,
        ref: mockData.ref,
        commits: [
          `${mappingPrefixes.commit}_${mockData.commits[0].id}`,
          `${mappingPrefixes.commit}_${mockData.commits[1].id}`,
          `${mappingPrefixes.commit}_${mockData.commits[2].id}`,
        ],
        repoId: `${mappingPrefixes.repo}_${mockData.repoId}`,
        organizationId: `${mappingPrefixes.organization}_${mockData.orgId}`,
        action: [
          {
            action: 'initialized',
            actionTime: '2021-09-01T00:00:00.000Z',
            actionDay: moment().format('dddd'),
          },
        ],
        createdAt: '2021-09-01T00:00:00.000Z',
        createdAtDay: moment().format('dddd'),
        computationalDate: '2021-09-01',
        githubDate: '2021-09-01',
      },
    };

    expect(pushProcessor.formattedData).toEqual(expectedFormattedData);
  });
});
