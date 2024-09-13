import { test, vi } from 'vitest';
import moment from 'moment';
import { PushProcessor } from '../push';
import { mappingPrefixes } from '../../constant/config';

const mockData = {
  id: 'mock-id',
  pusherId: 'mock-pusher-id',
  ref: 'mock-ref',
  commits: [{ id: 'mock-commit-id' }],
  repoId: 'mock-repo-id',
  orgId: 'mock-org-id',
  action: 'mock-action',
};
test('should format the data correctly', async ({ expect }) => {
  const mockRequestId = 'mock-request-id';
  const mockResourceId = 'mock-resource-id';

  const pushProcessor = new PushProcessor(mockData, mockRequestId, mockResourceId);

  // Mock parentId method
  pushProcessor.parentId = vi.fn().mockResolvedValue('mock-parent-id');

  // Mock calculateComputationalDate method
  pushProcessor.calculateComputationalDate = vi.fn().mockResolvedValue('mock-computational-date');

  await pushProcessor.format();

  const expectedFormattedData = {
    id: 'mock-parent-id',
    body: {
      id: `${mappingPrefixes.push}_${mockData.id}`,
      githubPushId: `${mockData.id}`,
      pusherId: `${mappingPrefixes.user}_${mockData.pusherId}`,
      ref: mockData.ref,
      commits: [`${mappingPrefixes.commit}_${mockData.commits[0].id}`],
      repoId: `${mappingPrefixes.repo}_${mockData.repoId}`,
      organizationId: `${mappingPrefixes.organization}_${mockData.orgId}`,
      action: [
        {
          action: mockData.action ?? 'initialized',
          actionTime: new Date().toISOString(),
          actionDay: moment().format('dddd'),
        },
      ],
      createdAt: new Date().toISOString(),
      createdAtDay: moment().format('dddd'),
      computationalDate: 'mock-computational-date',
      githubDate: moment().format('YYYY-MM-DD'),
    },
  };

  expect(pushProcessor.formattedData).toEqual(expectedFormattedData);
});
