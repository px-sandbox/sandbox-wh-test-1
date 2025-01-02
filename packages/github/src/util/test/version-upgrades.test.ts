import { describe, expect, it } from "vitest";
import { Github } from "abstraction";
import { VersionUpgradeSortType, VerUpgradeRes } from "abstraction/github/type/aggregations/version-upgrades";
import { SortKey, SortOrder } from "abstraction/github/enums";
import { sortData,paginate } from "../version-upgrades";

const sorting:VersionUpgradeSortType={
    "key":SortKey.DATEDIFF,
    "order":SortOrder.ASC,
}

const mockRepoData: VerUpgradeRes[] = [

   {
    _id: '1',
    repoId: 'repo1',
    organizationId: 'org1',
    version: '1.0',
    name: 'Library A',
    libName: 'LibA',
    releaseDate: '2023-01-01',
    isDeleted: false,
    isCore: true,
    dateDiff: 10,
    repoName: 'Repo One',
    currVerDate: '2023-02-01',
    currVer: '1.1',
    latestVer: '1.2',
    latestVerDate: '2023-03-01',
  },
  {
    _id: '2',
    repoId: 'repo2',
    organizationId: 'org1',
    version: '1.2',
    name: 'Library B',
    libName: 'LibB',
    releaseDate: '2023-02-01',
    isDeleted: false,
    isCore: false,
    dateDiff: 5,
    repoName: 'Repo Two',
    currVerDate: '2023-03-01',
    currVer: '1.3',
    latestVer: '1.4',
    latestVerDate: '2023-04-01',
  },
  {
    _id: '3',
    repoId: 'repo3',
    organizationId: 'org2',
    version: '2.0',
    name: 'Library C',
    libName: 'LibC',
    releaseDate: '2023-03-01',
    isDeleted: false,
    isCore: true,
    dateDiff: 0,
    repoName: 'Repo Three',
    currVerDate: '2023-04-01',
    currVer: '2.0',
    latestVer: '2.1',
    latestVerDate: '2023-05-01',
  },
  ];
describe('sortData',()=>{
    it('should sort data on the default basis if sort parameter is not given',async()=>{
        const result = await sortData(mockRepoData);
        expect(result).toEqual(
            [
                mockRepoData[0],mockRepoData[2],mockRepoData[1]
            ]
        )
    })

    it('should sort data on the basis of key and order if sort parameter is given',async ()=>{
        expect(await sortData(mockRepoData,sorting)).toEqual(
            [
                mockRepoData[2],mockRepoData[0],mockRepoData[1]  
            ]
        )
    })
})

describe('paginate',()=>{
    const mockData =   [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
        { id: 4, name: 'Item 4' },
        { id: 5, name: 'Item 5' },
        { id: 6, name: 'Item 6' },
        { id: 7, name: 'Item 7' },
        { id: 8, name: 'Item 8' },
        { id: 9, name: 'Item 9' },
        { id: 10, name: 'Item 10' },
      ];

    it('should return the correct items for the first page', async () => {
        const page = 1;
        const limit = 4;
        const result = await paginate(mockData, page, limit);
        expect(result).toEqual([
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' },
            { id: 3, name: 'Item 3' },
        ]);
        // 
        expect([1,2,3,4]).toEqual([1,2,3])
      });
    it('should return whole data if the limit is greater than the data available',async ()=>{
        const page = 1;
        const limit = 20;
        const result = await paginate(mockData, page, limit);
        expect(result).toEqual([
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' },
            { id: 3, name: 'Item 3' },
            { id: 4, name: 'Item 4' },
            { id: 5, name: 'Item 5' },
            { id: 6, name: 'Item 6' },
            { id: 7, name: 'Item 7' },
            { id: 8, name: 'Item 8' },
            { id: 9, name: 'Item 9' },
            { id: 10, name: 'Item 10' },
        ]);
    })
})