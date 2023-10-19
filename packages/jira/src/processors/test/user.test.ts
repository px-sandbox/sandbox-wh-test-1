import { beforeEach, expect, it, describe, vi, MockedFunction, MockedClass } from 'vitest';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { UserProcessor } from '../user';

const mockUser = {
    id: '123',
    body: {
        id: '456',
        userId: '789',
        emailAddress: 'johndoe@example.com',
        displayName: 'John Doe',
        avatarUrls: {
            avatarUrl48x48: 'https://example.com/avatars/johndoe.png',
            avatarUrl32x32: 'https://example.com/avatars/johndoe-32.png',
            avatarUrl24x24: 'https://example.com/avatars/johndoe-24.png',
            avatarUrl16x16: 'https://example.com/avatars/johndoe-16.png',
        },
        isActive: true,
        isDeleted: false,
        deletedAt: null,
        createdAt: '2022-01-01T00:00:00.000Z',
        organizationId: 'abc',
    },
};

vi.mock('src/constant/config', () => ({
    mappingPrefixes: 'jira_user',
}));
vi.mock('src/model/params-mapping', (mockParamsMapping) => ({
    ParamsMapping: mockParamsMapping,
}));

// eslint-disable-next-line max-lines-per-function
describe('userFormattedDataReciever', () => {
    let mockUserProcessor = vi.spyOn(
        UserProcessor.prototype, 'processor') as MockedFunction<typeof UserProcessor.prototype.processor>;
    let mockUserValidate = vi.spyOn(
        UserProcessor.prototype, 'validate') as MockedFunction<typeof UserProcessor.prototype.validate>;
    // const mockUserProcessor = UserProcessor as MockedClass<typeof UserProcessor>;
    const mockSendDataToQueue = vi.spyOn(
        UserProcessor.prototype, 'sendDataToQueue') as MockedFunction<typeof UserProcessor.prototype.sendDataToQueue>;
    // const mockSendDataToQueue = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    const mockGetParentId = vi.fn().mockResolvedValue('cec133a0-5fe7-42cd-ad7b-4a794dcb38a7');
    const mockNoParentId = vi.fn().mockResolvedValue('');

    it('should process user data', async () => {

        vi.setSystemTime(new Date('2023-08-29T00:00:00Z').toISOString());
        // Create a new instance of the Users class with the mock data
        const org = new UsersProcessor(mockData);
        org.getParentId = mockGetParentId;

        const mockValidate = mockUserValidate.mockReturnValue(false);
        const mockProcessor = mockUserProcessor.mockResolvedValue(mockUser);
        mockUserValidate = mockValidate;
        mockUserProcessor = mockProcessor;

        await handler(event);

        expect(mockLoggerInfo).toHaveBeenCalledWith('Records Length: 2');
        expect(mockUserValidate).toHaveBeenCalledTimes(2);
        expect(mockUserProcessor).toHaveBeenCalledTimes(2);
        expect(mockSendDataToQueue).toHaveBeenCalledTimes(2);
        expect(mockLogProcessToRetry).not.toHaveBeenCalled();
        expect(mockLoggerError).not.toHaveBeenCalled();
        // Log the input data passed to the mockUserProcessor function
        logger.info(mockUserProcessor.mock.calls);
    });


});
