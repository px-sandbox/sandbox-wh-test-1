import { Jira, Other } from 'abstraction';
import { ChangelogField, ChangelogStatus } from 'abstraction/jira/enums';
import { Hit, HitBody } from 'abstraction/other/type';
import { logger } from 'core';
import { getReopenRateDataById } from '../repository/issue/get-issue';

export function getSprintForTo(to: string, from: string): string | null {
  const toElements = to.split(', ').filter(Boolean);
  const fromElements = from.split(', ').filter(Boolean);
  let result = [];
  if (toElements.length === 0) {
    result[0] = null;
  } else if (toElements.length === 1) {
    result[0] = toElements[0];
  } else {
    result = toElements.filter((item) => !fromElements.includes(item));
  }
  if (result.length > 1) {
    return null;
  }
  return result[0];
}
