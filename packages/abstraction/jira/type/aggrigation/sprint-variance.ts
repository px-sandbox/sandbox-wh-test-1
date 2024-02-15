type sprint = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
};
export type BucketItem = {
  key: string;
  estimatedTime: {
    value: number;
  };
  actualTime: {
    value: number;
  };
};
export type SprintVariance = {
  sprint: sprint;
  time: {
    estimate: number;
    actual: number;
  };
  variance: number;
};

export type SprintVarianceData = {
  data: SprintVariance[];
  afterKey: string | undefined;
};
