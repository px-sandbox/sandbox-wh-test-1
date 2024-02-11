type SprintVariance =
  {
    sprint: {
      name: string;
      state: string;
      startDate: string;
      endDate: string;
    };
    time: {
      estimate: number;
      timeSpend: string;
    };
    variance: number
  }[];

export type SprintVariancenData = {
  data: SprintVariance[];
  afterKey: string | undefined;
}
