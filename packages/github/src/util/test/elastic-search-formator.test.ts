import { beforeEach, describe, expect, it } from 'vitest'
import { ElasticSearchFormator } from '../elastic-search-formator'
import { Other } from 'abstraction';

describe('ElasticSearchFormator',()=>{
    let formator:ElasticSearchFormator;

    beforeEach(() => {
        formator = new ElasticSearchFormator();
      });

    it('should filter out empty hits and return the ones having data',async()=>{
        const result:Other.Type.Result={
            hits:{
                hits:
                [
                    {_source :{"key":"values"}},
                    {_source:{"key":2}},
                    {_source:{}}
                ]
            }
        }
        const actual = await formator.exportActualResult(result);
        expect(actual).toEqual(
            [
                {"key":"values"},{"key":2}
            ]
        )
    })  
    it('should return empty array if no data is provided in hits ',async()=>{
        const result:Other.Type.Result={
            hits:{
                hits:
                [
                ]
            }
        }
        const actual = await formator.exportActualResult(result);
        expect(actual).toEqual(
            [
            ]
        )
    })
    it('should return empty array if no data is provided in _source ',async()=>{
        const result:Other.Type.Result={
            hits:{
                hits:
                [
                    {_source :{}},
                    {_source:{}},
                    {_source:{}}
                ]
            }
        }
        const actual = await formator.exportActualResult(result);
        expect(actual).toEqual(
            [
            ]
        )
    })
})