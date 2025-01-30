import moment from 'moment';
import { describe,it,expect } from 'vitest';
import { CalculateGraphAvgData } from 'abstraction/github/type';
import { calculateGraphAvg } from '../graph-average';
import { esbDateHistogramInterval } from '../../constant/config';


describe('calculateGraphAvg', () => {
  const baseData: CalculateGraphAvgData = {
    pr_time_in_seconds: { value: 86400 },
    key_as_string: '2023-09-01',
  };

  it('should return 0 when pr_time_in_seconds is 0', () => {
    const data: CalculateGraphAvgData = { ...baseData, pr_time_in_seconds: { value: 0 } };
    const result = calculateGraphAvg(esbDateHistogramInterval.day, data);
    expect(result).toBe(0);
  });

  it('should calculate daily average correctly', () => {
    const data: CalculateGraphAvgData = { ...baseData, key_as_string: '2023-09-01' };
    const result = calculateGraphAvg(esbDateHistogramInterval.day, data);
    expect(result).toBe(86400);
  });

  it('should calculate monthly average correctly', () => {
    const data: CalculateGraphAvgData = { ...baseData, key_as_string: '2023-09-01' };
    const result = calculateGraphAvg(esbDateHistogramInterval.month, data);
    const totalDaysInMonth = moment(data.key_as_string).daysInMonth();
    expect(result).toBe(86400 / totalDaysInMonth);
  });

  it('should calculate two-day average correctly', () => {
    const data: CalculateGraphAvgData = { ...baseData, key_as_string: '2023-09-01' };
    const result = calculateGraphAvg(esbDateHistogramInterval['2d'], data);
    expect(result).toBe(86400 / 2); 
  });

  it('should calculate three-day average correctly', () => {
    const data: CalculateGraphAvgData = { ...baseData, key_as_string: '2023-09-01' };
    const result = calculateGraphAvg(esbDateHistogramInterval['3d'], data);
    expect(result).toBe(86400 / 3); 
  });

  it('should calculate yearly average correctly', () => {
    const data: CalculateGraphAvgData = { ...baseData, key_as_string: '2023-01-01' };
    const result = calculateGraphAvg(esbDateHistogramInterval.year, data);
    const totalDaysInYear = moment(data.key_as_string, 'YYYY-MM-DD').clone().endOf('year').dayOfYear();
    expect(result).toBe(86400 / totalDaysInYear);
  });

  it('should return 0 for unrecognized interval', () => {
    const data: CalculateGraphAvgData = { ...baseData, key_as_string: '2023-09-01' };
    const result = calculateGraphAvg('unknown_interval', data);
    expect(result).toBe(0);
  });
});


