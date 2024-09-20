import { describe, it, vi, expect } from 'vitest';
import { PRReview } from 'abstraction/github/external/webhook';
import moment from 'moment';
import { mappingPrefixes } from '../../constant/config';
import {PRReviewProcessor} from  '../pr-review'


export function generateuniqIds() {
  return '94cc22e3-824b-48d5-8df7-12a9c613596b';
}

   const mockGetParentId = vi.fn().mockResolvedValue('94cc22e3-824b-48d5-8df7-12a9c613596b');
   vi.setSystemTime(new Date('2024-09-04T00:00:00Z').toISOString());
       
   const mockData: PRReview = {
       id: 1234,
       commit_id: "fkljnfj_jkgnjkf_jfngjf_jdfnfjd",
       user: {
         id: 23456,
         type: "User"
       },
       body: "djfngjrn-jfnnfg",
       submitted_at: "fkgkgn-dkffkv",
       state: "fmbnrgjvn-dvjbrfvhjb",
       orgId: 5678
     };
   
   
     describe("preReviewProcessor" , async () => {
         it("should process the PR Review data correctly", async () =>{
              const processor  = new PRReviewProcessor(
                 mockData,
                 5678,
                 1234,
                 'created',
                 mockData.orgId,
                 'jvndkbvkjvbrivir_sdjnejkgn_34234',
                 'ekjrnijnjk_ejknorei_jnfjj23'
               )
           processor.parentId = mockGetParentId;
           await processor.process();
           const output = processor.formattedData;
           expect(output).toEqual({
               id: generateuniqIds(),
               body: {
                 id: `${mappingPrefixes.pRReview}_${mockData.id}`,
                 githubPRReviewId: mockData.id,
                 commitId: `${mappingPrefixes.commit}_${mockData.commit_id}`,
                 reviewedBy: `${mappingPrefixes.user}_${mockData.user.id}`,
                 reviewBody: mockData.body,
                 submittedAt: mockData.submitted_at,
                 state: mockData.state,
                 pullId: `${mappingPrefixes.pull}_5678`,   
                 repoId: `${mappingPrefixes.repo}_1234`,   
                 organizationId: `${mappingPrefixes.organization}_${mockData.orgId}`,
                 action: [
                   {
                     action: 'created',
                     actionTime: new Date().toISOString(),
                     actionDay: moment().format('dddd'),
                   },
                 ],
                 createdAtDay: moment(mockData.submitted_at).format('dddd'),
                 computationalDate: await processor.calculateComputationalDate(mockData.submitted_at), 
                 githubDate: moment(mockData.submitted_at).format('YYYY-MM-DD'),
               },
         })
       })
       
       
       it("should process the data in PR review correctly when no parent Id is found", async () =>{
        const processor  = new PRReviewProcessor(
            mockData,
            5678,
            1234,
            'created',
             mockData.orgId,                          
            'jvndkbvkjvbrivir_sdjnejkgn_34234',
            'ekjrnijnjk_ejknorei_jnfjj23'
          )

        processor.getParentId = vi.fn().mockResolvedValue(null);
        vi.mock('uuid', () => ({
          v4: vi.fn(() => generateuniqIds()),
        }));
        processor.putDataToDynamoDB = vi.fn().mockResolvedValue(generateuniqIds());
        await processor.process();
        const output = processor.formattedData;

        expect(output).toEqual({
            id: generateuniqIds(),
            body: {
              id: `${mappingPrefixes.pRReview}_${mockData.id}`,
              githubPRReviewId: mockData.id,
              commitId: `${mappingPrefixes.commit}_${mockData.commit_id}`,
              reviewedBy: `${mappingPrefixes.user}_${mockData.user.id}`,
              reviewBody: mockData.body,
              submittedAt: mockData.submitted_at,
              state: mockData.state,
              pullId: `${mappingPrefixes.pull}_5678`,   
              repoId: `${mappingPrefixes.repo}_1234`,   
              organizationId: `${mappingPrefixes.organization}_${mockData.orgId}`,
              action: [
                {
                  action: 'created',
                  actionTime: new Date().toISOString(),
                  actionDay: moment().format('dddd'),
                },
              ],
              createdAtDay: moment(mockData.submitted_at).format('dddd'),
              computationalDate: await processor.calculateComputationalDate(mockData.submitted_at), 
              githubDate: moment(mockData.submitted_at).format('YYYY-MM-DD'),
            },

      })
    })
          
      // Deleted test cases
      const DeleteMockPRReview: PRReview = {
        id: 1234,
        commit_id: "fkljnfj_jkgnjkf_jfngjf_jdfnfjd",
        user: {
          id: 23456,
          type: "User"
        },
        body: "djfngjrn-jfnnfg",
        submitted_at: "fkgkgn-dkffkv",
        state: "fmbnrgjvn-dvjbrfvhjb",
        orgId: 5678
      };      
      it("should process the deleted PR review data correctly", async () =>{
         const processor   = new PRReviewProcessor(
           DeleteMockPRReview,
           5678,
           1234,
           'deleted',
           DeleteMockPRReview.orgId,
           'jvndkbvkjvbrivir_sdjnejkgn_34234',
           'ekjrnijnjk_ejknorei_jnfjj23'
         )
         processor.parentId = mockGetParentId;
         await processor.process();
         const output = processor.formattedData;
         expect(output).toEqual({
             id: generateuniqIds(),
             body: {
               id: `${mappingPrefixes.pRReview}_${mockData.id}`,
               githubPRReviewId: mockData.id,
               commitId: `${mappingPrefixes.commit}_${mockData.commit_id}`,
               reviewedBy: `${mappingPrefixes.user}_${mockData.user.id}`,
               reviewBody: mockData.body,
               submittedAt: mockData.submitted_at,
               state: mockData.state,
               pullId: `${mappingPrefixes.pull}_5678`,   
               repoId: `${mappingPrefixes.repo}_1234`,   
               organizationId: `${mappingPrefixes.organization}_${mockData.orgId}`,
               action: [
                 {
                   action: 'deleted',
                   actionTime: new Date().toISOString(),
                   actionDay: moment().format('dddd'),
                 },
               ],
               createdAtDay: moment(mockData.submitted_at).format('dddd'),
               computationalDate: await processor.calculateComputationalDate(mockData.submitted_at), 
               githubDate: moment(mockData.submitted_at).format('YYYY-MM-DD'),
             },
        })
       }
      )

      it("should process the PR review data correctly when action is deleted and no parent Id is found", async () =>{
       const processor  = new PRReviewProcessor(
          mockData,
          5678,
          1234,
          'deleted',
           mockData.orgId,                          
          'jvndkbvkjvbrivir_sdjnejkgn_34234',
          'ekjrnijnjk_ejknorei_jnfjj23'
       )
        console.log(processor)
        processor.getParentId = vi.fn().mockResolvedValue(null);
        vi.mock('uuid', () => ({
          v4: vi.fn(() => generateuniqIds()),
        }));
        processor.putDataToDynamoDB = vi.fn().mockResolvedValue(generateuniqIds());
        await processor.process();
        const output = processor.formattedData      
        expect(output).toEqual({
        id: generateuniqIds(),
        body: {
          id: `${mappingPrefixes.pRReview}_${mockData.id}`,
          githubPRReviewId: mockData.id,
          commitId: `${mappingPrefixes.commit}_${mockData.commit_id}`,
          reviewedBy: `${mappingPrefixes.user}_${mockData.user.id}`,
          reviewBody: mockData.body,
          submittedAt: mockData.submitted_at,
          state: mockData.state,
          pullId: `${mappingPrefixes.pull}_5678`,   
          repoId: `${mappingPrefixes.repo}_1234`,   
          organizationId: `${mappingPrefixes.organization}_${mockData.orgId}`,
          action: [
            {
              action: 'deleted',
              actionTime: new Date().toISOString(),
              actionDay: moment().format('dddd'),
            },
          ],
          createdAtDay: moment(mockData.submitted_at).format('dddd'),
          computationalDate: await processor.calculateComputationalDate(mockData.submitted_at), 
          githubDate: moment(mockData.submitted_at).format('YYYY-MM-DD'),
      
        }      
       })
     })


       // test case when no action is provided
       let action:string;
       it("should process the PR review data correctly when no action is undefined", async () =>{
        const processor  = new PRReviewProcessor(
           mockData,
           5678,
           1234,
           action,
           mockData.orgId,
           'jvndkbvkjvbrivir_sdjnejkgn_34234',
           'ekjrnijnjk_ejknorei_jnfjj23'
         )
         processor.parentId = mockGetParentId;
         await processor.process();
         const output = processor.formattedData;
         expect(output).toEqual({
            id: generateuniqIds(),
            body: {
              id: `${mappingPrefixes.pRReview}_${mockData.id}`,
              githubPRReviewId: mockData.id,
              commitId: `${mappingPrefixes.commit}_${mockData.commit_id}`,
              reviewedBy: `${mappingPrefixes.user}_${mockData.user.id}`,
              reviewBody: mockData.body,
              submittedAt: mockData.submitted_at,
              state: mockData.state,
              pullId: `${mappingPrefixes.pull}_5678`,   
              repoId: `${mappingPrefixes.repo}_1234`,   
              organizationId: `${mappingPrefixes.organization}_${mockData.orgId}`,
              action: [
                {
                  action: 'initialized',
                  actionTime: new Date().toISOString(),
                  actionDay: moment().format('dddd'),
                },
              ],
              createdAtDay: moment(mockData.submitted_at).format('dddd'),
              computationalDate: await processor.calculateComputationalDate(mockData.submitted_at), 
              githubDate: moment(mockData.submitted_at).format('YYYY-MM-DD'),
         },
    })
  })
})