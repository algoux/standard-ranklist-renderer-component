import { describe, expect, it } from 'vitest';
import {
  getRanklistProblemPresentation,
  getRankProblemDisplayStatus,
  getSolutionDisplayResult,
  isBeforeContestFreeze,
} from '../src';
import { makeCCPC26Ranklist } from '../../../tests/shared/ccpc26-fixture';

describe('shared CCPC26 presentation', () => {
  it('derives original-index presentation without modifying the snapshot', () => {
    const data = makeCCPC26Ranklist();
    const before = JSON.stringify(data);
    const view = getRanklistProblemPresentation(data, true);
    expect(view.problemColumns).toEqual([0, 2, null, null, null]);
    expect(view.rowProblemIndexes).toEqual([
      [0, 2, 1, 4, 3],
      [0, 2, 3, 1, 4],
    ]);
    expect(view.problemRevealed).toEqual([true, false, true, false, false]);
    expect(view.headerClassNames).toEqual([undefined, 'srk-ccpc26-revealed-boundary', undefined, undefined, undefined]);
    expect(view.hasRevealDivider).toBe(true);
    expect(JSON.stringify(data)).toBe(before);
  });

  it('handles all/none revealed, missing statuses and disabled mode', () => {
    for (const count of [0, 3])
      expect(getRanklistProblemPresentation(makeCCPC26Ranklist(count), true).hasRevealDivider).toBe(false);
    const data = makeCCPC26Ranklist();
    data.rows[1].statuses = [];
    expect(getRanklistProblemPresentation(data, true).rowProblemIndexes[1]).toHaveLength(5);
    const ordinary = getRanklistProblemPresentation(data);
    expect(ordinary.problemColumns).toEqual([0, 1, 2, 3, 4]);
    expect(ordinary.problemRevealed).toEqual([true, true, true, true, true]);
    expect(ordinary.hasRevealDivider).toBe(false);
  });

  it('projects anonymous FB without changing raw status or solution history', () => {
    const status = makeCCPC26Ranklist().rows[0].statuses[1];
    Object.freeze(status);
    Object.freeze(status.solutions);
    const display = getRankProblemDisplayStatus(status, false);
    expect(display.result).toBe('AC');
    expect(display.solutions).toBe(status.solutions);
    expect(status.result).toBe('FB');
    expect(getRankProblemDisplayStatus(status)).toBe(status);
    expect(getRankProblemDisplayStatus(undefined, false)).toEqual({ result: null });
    expect(getSolutionDisplayResult('FB', false)).toBe('AC');
    expect(getSolutionDisplayResult('WA', false)).toBe('WA');
    expect(getSolutionDisplayResult('FB')).toBe('FB');
  });

  it('uses explicit elapsed time and honors the exact freeze boundary', () => {
    const contest = makeCCPC26Ranklist().contest;
    expect(isBeforeContestFreeze(contest, null)).toBe(false);
    expect(isBeforeContestFreeze(contest, 0)).toBe(true);
    expect(isBeforeContestFreeze(contest, 480000 - 1)).toBe(true);
    expect(isBeforeContestFreeze(contest, 480000)).toBe(false);
    expect(isBeforeContestFreeze({ ...contest, frozenDuration: undefined }, 599999)).toBe(true);
    expect(isBeforeContestFreeze({ ...contest, frozenDuration: undefined }, 600000)).toBe(false);
  });
});
