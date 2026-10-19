import type * as srk from '@algoux/standard-ranklist';
import { formatTimeDuration, getCCPC26ProblemLayout, getCCPC26RowProblemOrder } from '@algoux/standard-ranklist-utils';

/** Display indexes retain their original SRK identity; null headers are anonymous slots. */
export interface RanklistProblemPresentation {
  problemColumns: Array<number | null>;
  rowProblemIndexes: number[][];
  problemRevealed: boolean[];
  revealedProblemCount: number;
  hasRevealDivider: boolean;
  headerClassNames: Array<string | undefined>;
}

/** Derive one framework-independent presentation from the complete current snapshot. */
export function getRanklistProblemPresentation(
  ranklist: srk.Ranklist,
  enableCCPC26 = false,
): RanklistProblemPresentation {
  const layout = enableCCPC26 ? getCCPC26ProblemLayout(ranklist) : undefined;
  const revealed = layout ? new Set(layout.revealedProblemIndexes) : undefined;
  const revealedProblemCount = layout ? layout.revealedProblemIndexes.length : ranklist.problems.length;
  const hasRevealDivider = !!layout && revealedProblemCount > 0 && layout.hiddenProblemIndexes.length > 0;
  const problemColumns: Array<number | null> = layout
    ? [...layout.revealedProblemIndexes, ...layout.hiddenProblemIndexes.map(() => null)]
    : ranklist.problems.map((_, index) => index);
  return {
    problemColumns,
    rowProblemIndexes: ranklist.rows.map((row) =>
      layout ? getCCPC26RowProblemOrder(row.statuses, layout) : row.statuses.map((_, index) => index),
    ),
    problemRevealed: ranklist.problems.map((_, index) => (revealed ? revealed.has(index) : true)),
    revealedProblemCount,
    hasRevealDivider,
    headerClassNames: problemColumns.map((_, columnIndex) =>
      hasRevealDivider && columnIndex === revealedProblemCount - 1 ? 'srk-ccpc26-revealed-boundary' : undefined,
    ),
  };
}

/** Project only the rendered result; callers keep the original status in interactions. */
export function getRankProblemDisplayStatus(
  status: srk.RankProblemStatus | undefined,
  problemRevealed = true,
): srk.RankProblemStatus {
  if (!status) return { result: null };
  return !problemRevealed && status.result === 'FB' ? { ...status, result: 'AC' } : status;
}

export function getSolutionDisplayResult(
  result: srk.Solution['result'],
  problemRevealed = true,
): srk.Solution['result'] {
  return !problemRevealed && result === 'FB' ? 'AC' : result;
}

/** Explicit caller time only; null is the final/non-replay snapshot, not the wall clock. */
export function isBeforeContestFreeze(contest: srk.Contest, elapsed: number | null): boolean {
  if (elapsed === null) return false;
  const frozenAt =
    formatTimeDuration(contest.duration) - (contest.frozenDuration ? formatTimeDuration(contest.frozenDuration) : 0);
  return elapsed < frozenAt;
}
