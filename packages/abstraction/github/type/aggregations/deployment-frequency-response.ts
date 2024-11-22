export interface AggregationResponse {
    destination_counts: {
      buckets: [
        {
          key: string; 
          doc_count: number;
        }
      ];
    };
  }
