import moment from 'moment';
import { describe, expect, it } from 'vitest';
import { OnDemandAllocationStrategy } from 'aws-cdk-lib/aws-autoscaling';
import { getOffsetTime,getTimeWithOffset,regulariseDate,getDays,getWorkingTime } from'../timezone-calculation' ;
// type Offset = {
//     radical: '+' | '-';
//     hours: number;
//     minutes: number;
//   };

describe('getOffsetTime',()=>{
    it('should return radicals , hours and minutes',()=>{
        expect(getOffsetTime("+04:58")).toEqual({"radical":'+',hours:4,"minutes":58})
    })
    it('should return radicals , hours and minutes',()=>{
        expect(getOffsetTime("-14:58")).toEqual({"radical":'-',hours:14,"minutes":58})
    })
})

describe('getTimeWithOffset',()=>{
    it('should add with + radical',()=>{
        const initialDate = moment('2024-09-13T12:00:00');
        const offset = { "radical": '+' as '+' | '-', "hours": 2, "minutes": 30 };
        const result = getTimeWithOffset(initialDate, offset);
        const expectedDate = moment('2024-09-13T14:30:00');
        expect(result.isSame(expectedDate)).toBe(true);
})
    it('should subtract with - radical',()=>{
        const initialDate = moment('2024-09-13T12:00:00');
        const offset= { "radical": '-' as '+' | '-', "hours": 2, "minutes": 30 };
        const result = getTimeWithOffset(initialDate, offset);
        const expectedDate = moment('2024-09-13T09:30:00');
        expect(result.isSame(expectedDate)).toBe(true);
    })

    it('should change date also if day changes by adding or subtracting time',()=>{
        const initialDate = moment('2024-09-13T23:00:00');
        const offset= { "radical": '+' as '+' | '-', "hours": 2, "minutes": 30 };
        const result = getTimeWithOffset(initialDate, offset);
        const expectedDate = moment('2024-09-14T01:30:00');
        expect(result.isSame(expectedDate)).toBe(true);
    })

    it('should handle default cases',()=>{
        const initialDate = moment('2024-09-13T23:00:00');
        const offset= { "radical": '*' as '+' | '-', "hours": 2, "minutes": 30 };
        const result = getTimeWithOffset(initialDate, offset);

    })
})

describe('regulariseData',()=>{

    
    it('should make data to monday at 9:30 if it is at saturday',()=>{
        const saturday = moment('2024-09-14T15:00:00'); 
        const result = regulariseDate(saturday);
        const expected = moment('2024-09-16T09:30:00'); 
        expect(result.isSame(expected)).toBe(true);
    })

    it('should make data to monday at 9:30 if it is at sunday',()=>{
        const sunday = moment('2024-09-15T15:00:00'); 
        const result = regulariseDate(sunday);
        const expected = moment('2024-09-16T09:30:00'); 
        expect(result.isSame(expected)).toBe(true);
    })

    it('should return min date if the given date is before min',()=>{
        const day=moment('2024-09-17T07:30:00');
        const result=regulariseDate(day);
        const expected = moment('2024-09-17T09:30:00'); 
        expect(result.isSame(expected)).toBe(true);
    })

    it('should return max date if the given date is after max',()=>{
        const day=moment('2024-09-17T21:30:00');
        const result=regulariseDate(day);
        const expected = moment('2024-09-17T18:30:00'); 
        expect(result.isSame(expected)).toBe(true);
    })

    it('should return the date if it is between the two',()=>{
        const day=moment('2024-09-17T13:30:00');
        const result=regulariseDate(day);
        const expected = moment('2024-09-17T13:30:00'); 
        expect(result.isSame(expected)).toBe(true);
    })
})

describe('getDays',()=>{
    it('should return the number of days between two dates , including the end date',()=>{
        const startDate = moment('2024-09-01');
        const endDate = moment('2024-09-10');
        expect(getDays(startDate,endDate)).toBe(9);
    })
})

describe('getWorkingTime',()=>{
    it('should return the total working time excluding weekends',()=>{
        const startDate = moment('2024-09-01T08:00:00');
        const endDate = moment('2024-09-15T17:00:00');
        const offset="+05:30";
        expect(getWorkingTime(startDate,endDate,offset)).toBe(324000);
    })
})