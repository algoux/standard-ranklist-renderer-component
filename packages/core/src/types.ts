import type * as srk from '@algoux/standard-ranklist';

export interface RankValue {
  /** Rank value initially. If the user is unofficial and rank value equals null, it will be rendered as unofficial mark such as '*'. */
  rank: number | null;

  /**
   * Series segment index which this rank belongs to initially. `null` means this rank does not belong to any segment. `undefined` means it will be calculated automatically (only if the segment's count property exists).
   * @defaultValue null
   */
  segmentIndex?: number | null;
}

export type StaticRanklist = Omit<srk.Ranklist, 'rows'> & {
  rows: Array<srk.RanklistRow & { rankValues: RankValue[] }>;
};

export type StaticRanklistRow = StaticRanklist['rows'][number];

export interface UserClickPayload {
  user: srk.User;
  row: StaticRanklistRow;
  rowIndex: number;
  ranklist: StaticRanklist;
}

export interface ProblemClickPayload {
  problem: srk.Problem;
  problemIndex: number;
  ranklist: StaticRanklist;
}

export interface SolutionClickPayload {
  user: srk.User;
  row: StaticRanklistRow;
  rowIndex: number;
  problemIndex: number;
  problem: srk.Problem | undefined;
  status: srk.RankProblemStatus;
  solutions: srk.Solution[];
  ranklist: StaticRanklist;
}
