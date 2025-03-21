import moment from 'moment';

const tomorrow = moment().add(1, 'day').format('YYYY-MM-DD');

export const workbreakdownGraphSchema = {
  type: 'object',
  properties: {
    queryStringParameters: {
      type: 'object',
      properties: {
        repoIds: {
          type: 'string',
          pattern: '^gh_repo_[0-9]+(,gh_repo_[0-9]+)*$' // Validates gh_repo_id format
        },
        startDate: {
          type: 'string',
          pattern: '^20[0-9]{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])$'
        },
        endDate: {
          type: 'string',
          pattern: '^20[0-9]{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])$',
          default: tomorrow
        }
      },
      required: ['repoIds', 'startDate'],
      additionalProperties: false
    }
  }
}; 