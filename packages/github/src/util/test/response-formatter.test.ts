import { describe, expect, it } from 'vitest';
import { formatOrgDataResponse, formatRepoDataResponse, formatRepoSastData, formatUserDataResponse, generateUuid, searchedDataFormator } from "../response-formatter";

describe('searchedDataFormator',()=>{
    it('should remove the deleted ones and return the left over',async ()=>{
        const result = {
            hits: {
              total: { value: 2 },
              hits: [
                { _id: '1', _source: { body: { id: '1', name: 'Test1', isDeleted: false } } },
                { _id: '2', _source: { body: { id: '2', name: 'Test2', isDeleted: true } } },
                { _id: '3', _source: { body: { id: '3', name: 'Test3' } } },
              ],
            },
          };
          const formattedData = await searchedDataFormator(result);
          expect(formattedData).toEqual([
            { _id: '1', id: '1', name: 'Test1',isDeleted: false  },
            { _id: '3', id: '3', name: 'Test3' },
          ]);
        });

    it('should return empty array if hits is empty',async()=>{
        const result = {
            hits: {
              total: { value: 0},
              hits: [],
            },
          };
          const formattedData = await searchedDataFormator(result);
          expect(formattedData).toEqual([]);
    })  
    }
)
describe('formatRepoSastData',()=>{
  it('should return empty array if total value is 0',async()=>{
    const result = {
      hits: {
        total: { value: 0 },
        hits: [],
      },
    };
    const formattedData=await(formatRepoSastData(result));
    expect(formattedData).toEqual([]);
  })

  it('should  return the arrays if total value > 0',async()=>{
    const result = {
      hits: {
        total: { value: 3 },
        hits: [
          { _id: '1', _source: { body: { id: '1', name: 'Test1', isDeleted: false } } },
          { _id: '2', _source: { body: { id: '2', name: 'Test2', isDeleted: true } } },
          { _id: '3', _source: { body: { id: '3', name: 'Test3' } } },
        ],
      },
    };
    const formattedData = await formatRepoSastData(result);
    expect(formattedData).toEqual([
          { _id: '1',body: { id: '1', name: 'Test1', isDeleted: false } },
          { _id: '2',body: { id: '2', name: 'Test2', isDeleted: true } } ,
          { _id: '3',body: { id: '3', name: 'Test3' } },
    ]);
  });
  })

describe('formatUserDataResponse',()=>{
  it('should format user data correctly',()=>{

    const input={
      _id: 1,
      id: 2,
      githubId:3,
      userName: 'Hello',
      avatarUrl: 'Bye@com',
      organizationId: 'SG'
    }

    const output={
      id: 1,
      githubId: 2,
      userName: 'Hello',
      avatarUrl: 'Bye@com',
      organizationId: 'SG'
    }
    expect(formatUserDataResponse(input)).toEqual(output);
  })
})  

describe('formatRepoDataResponse',()=>{
  it('should format the repo data correctly',()=>{
    const input=[
      {  id: 1,  _id: 2,  githubId: '12',  name: 'PULSE',  topics: 'IMPORTANT',  organizationId: 'SG'},
      {  id: 5,  _id: 6,  githubId: '122',  name: 'DEVICE',  topics: 'CRITICAL',  organizationId: 'RANDOM'}
    ]
    const output=[
      { id: 2,  githubId: 1,  name:'PULSE',  topics: 'IMPORTANT',  organizationId: 'SG'},
      { id: 6,  githubId: 5,  name:'DEVICE',  topics: 'CRITICAL',  organizationId: 'RANDOM'}

    ]
    expect(formatRepoDataResponse(input)).toEqual(output)
  })
})

describe('formatOrgDataResponse',()=>{
  it('should format the org data correctly',()=>{
    const input =[
      { _id: '1',id: '2',githubOrganizationId: '3',name: 'DevOPS',createdAt: 'Today',updatedAt: 'Tomorrow'}
    ]
    const output=[
      {id: '2',name: 'DevOPS'}
    ]
    expect(formatOrgDataResponse(input)).toEqual(output)
  })
})

describe('generateUuid',()=>{
  it('should return uuid',()=>{
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    const uuid= generateUuid();

    expect(uuid).toMatch(uuidRegex)
  })
})