import moment from 'moment';
import { getWeekendsFromRemainingDays,getWeekenedCount,getWeekDaysCount } from '../weekend-calculations';
import { describe, expect, it } from 'vitest';

describe('getWeekendFromRemainingDays',()=>{
    it('should return 0 , if remaining days is 0',()=>{
        const startDate=moment('2024-09-01');
        expect(getWeekendsFromRemainingDays(startDate,0)).toBe(0);
    })
    it('should return 1 , if start day is sunday',()=>{
        const startDate=moment('2024-09-01');
        const startDay = startDate.day();
        expect(getWeekendsFromRemainingDays(startDate,1)).toBe(1);
    })
    it('should return weekends according to cases defined',()=>{
        const startDate=moment('2024-09-02');
        expect(getWeekendsFromRemainingDays(startDate,4)).toBe(0);
    })
})

describe('getWeekendCount',()=>{
    it('should return the number of weekend days between two dates',()=>{
        expect(getWeekenedCount('2024-09-01','2024-09-01')).toBe(1);
        expect(getWeekenedCount('2024-09-01','2024-09-07')).toBe(2);
        expect(getWeekenedCount('2024-09-01','2024-09-14')).toBe(4);
    })
    it('should return 0 if there are no weekend days',()=>{
        expect(getWeekenedCount('2024-09-03','2024-09-05')).toBe(0);
    })
})

describe('getWeekDaysCount',()=>{
    it('should return the number of week days between two dates',()=>{
        expect(getWeekDaysCount('2024-09-02','2024-09-06')).toBe(5);
        expect(getWeekDaysCount('2024-09-14','2024-09-26')).toBe(9);
    })
    it('should return 0 if there are no week days',()=>{
        expect(getWeekDaysCount('2024-09-21','2024-09-22')).toBe(0);
    })
})