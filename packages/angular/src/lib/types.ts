import type * as srk from '@algoux/standard-ranklist';
import type {
  ProblemStatisticsFooter,
  RanklistColumnTitles,
  RanklistStatusCellPreset,
  RanklistUserAvatarPlacement,
} from '@algoux/standard-ranklist-renderer-component-core';

export interface RankValue {
  rank: number | null;
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

export type {
  ProblemStatisticsFooter,
  RanklistColumnTitles,
  RanklistStatusCellPreset,
  RanklistUserAvatarPlacement,
};
