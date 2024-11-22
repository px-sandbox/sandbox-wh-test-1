import moment from 'moment';
import { beforeEach, describe, it, vi } from 'vitest';
import { GHCopilotProcessor } from '../gh-copilot';
import { mappingPrefixes } from '../../constant/config';

export function generateuniqIds() {
  return '94cc22e3-824b-48d5-8df7-12a9c613596b';
}

describe('GHCopilotProcessor', async () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2024-09-04T00:00:00Z'));
    vi.mock('uuid', () => ({
      v4: vi.fn(() => generateuniqIds()),
    }));
  });
  const mockData: any = {
    created_at: '2024-09-04T00:00:00Z',
    updated_at: '2024-09-04T00:00:00Z',
    pending_cancellation_date: null,
    last_activity_at: '2022-01-01T00:00:00Z',
    last_activity_editor: [
      'mock-editor/mock-editor-version/mock-feature-used/mock-feature-version',
    ].join('/'),
    assigning_team: {
      name: 'test',
      id: 123,
      node_id: 'test',
      slug: 'test',
      description: 'test',
    },
    assignee: {
      login: 'test',
      id: 123,
    },
  };

  it('should process the data correctly', async ({ expect }) => {
    const mockRequestId = '1234567890';
    const ghCopilotProcessor = new GHCopilotProcessor(
      mockData,
      mockRequestId,
      mockData.assignee.login
    );

    const expectedFormattedData = {
      id: generateuniqIds(),
      body: {
        dataTimestamp: new Date().toISOString(),
        lastUsedAt: mockData.last_activity_at,
        isUsedInLastHour: moment
          .utc(mockData.last_activity_at)
          .isAfter(moment.utc().subtract(1, 'hour')),
        editor: mockData.last_activity_editor.split('/')[0],
        editorVersion: mockData.last_activity_editor.split('/')[1],
        featureUsed: mockData.last_activity_editor.split('/')[2],
        featureVersion: mockData.last_activity_editor.split('/')[3],
        userId: `${mappingPrefixes.user}_${mockData.assignee.id}`,
      },
    };
    await ghCopilotProcessor.process();

    expect(ghCopilotProcessor.formattedData).toEqual(expectedFormattedData);
  });
});
