import { describe, expect, it } from 'vitest';
import {
  normalizeRanklistRowWindow,
  isRanklistRowInWindow,
  normalizeRanklistRowHeight,
  getRanklistTableLayout,
  isRanklistIdentityClick,
} from '../src/window';

describe('controlled row windows', () => {
  it('normalizes bounds without excluding data from ranking', () => {
    expect(normalizeRanklistRowWindow({ start: -2, end: 20 }, 4)).toEqual({ start: 0, end: 4 });
    expect(normalizeRanklistRowWindow({ start: 3.9, end: 1 }, 4)).toEqual({ start: 3, end: 3 });
    expect(normalizeRanklistRowWindow({ start: 0, end: 1 }, 0)).toEqual({ start: 0, end: 0 });
    expect(normalizeRanklistRowWindow({ start: NaN, end: 1 }, 4)).toBeUndefined();
    expect(isRanklistRowInWindow(999, undefined)).toBe(true);
    expect(isRanklistRowInWindow(2, { start: 1, end: 2 })).toBe(false);
    expect(isRanklistRowInWindow(1, { start: 1, end: 2 })).toBe(true);
  });
  it('does not emit invalid CSS heights', () => {
    for (const value of [undefined, 0, -1, NaN, Infinity]) expect(normalizeRanklistRowHeight(value)).toBeUndefined();
    expect(normalizeRanklistRowHeight(60)).toBe(60);
  });
});

describe('SSR-safe table layout', () => {
  it('keeps Name as the sole flexible column and computes thin-row offsets', () => {
    const layout = getRanklistTableLayout([40, 220, 240, 60, 80, 70], {
      seriesCount: 1,
      problemCount: 1,
      splitOrganization: true,
      showTimeColumn: true,
    })!;
    expect(layout.userColumn).toBe(2);
    expect(layout.totalColumns).toBe(6);
    expect(layout.style.minWidth).toBe('710px');
    expect(layout.style['--srk-search-ranks-width']).toBe('40px');
    expect(layout.style['--srk-search-tail-width']).toBe('210px');
    expect(layout.groups[0].columns.map((column) => column.width)).toEqual([
      '40px',
      '220px',
      'auto',
      '60px',
      '80px',
      '70px',
    ]);
  });
  it('preserves CCPC reveal groups without zero-span groups', () => {
    const options = { seriesCount: 0, problemCount: 3, hasRevealDivider: true, revealedProblemCount: 1 };
    const layout = getRanklistTableLayout([240, 60, 70, 70, 70], options)!;
    expect(layout.groups.map((group) => [group.start, group.end, group.className])).toEqual([
      [0, 2, ''],
      [2, 3, 'srk-ccpc26-revealed-columns'],
      [3, 5, ''],
    ]);
    expect(getRanklistTableLayout([240, 60, 70, 70, 70], { ...options, revealedProblemCount: 0 })!.groups).toHaveLength(
      2,
    );
  });
  it('ignores incomplete or invalid widths and never mutates caller arrays', () => {
    const options = { seriesCount: 0, problemCount: 0 };
    const widths = Object.freeze([240, 60]);
    expect(getRanklistTableLayout(widths, options)?.totalColumns).toBe(2);
    for (const bad of [undefined, [], [240], [240, NaN], [240, -1], [240, Infinity]])
      expect(getRanklistTableLayout(bad, options)).toBeUndefined();
    expect(widths).toEqual([240, 60]);
  });
});

describe('retained identity pointer target', () => {
  it('accepts text and accessible activation, excluding neighboring blank columns', () => {
    const table = document.createElement('table');
    table.innerHTML =
      '<thead><tr><th>Rank</th><th>Name</th></tr></thead><tbody><tr><td colspan="2"><span data-search-text="name">Alpha</span></td></tr></tbody>';
    const cell = table.tBodies[0].rows[0].cells[0];
    table.tHead!.rows[0].cells[1].getBoundingClientRect = () => ({ left: 40, right: 200 } as DOMRect);
    expect(isRanklistIdentityClick({ detail: 1, clientX: 10, target: cell, currentTarget: cell }, 1)).toBe(false);
    expect(isRanklistIdentityClick({ detail: 1, clientX: 60, target: cell, currentTarget: cell }, 1)).toBe(true);
    expect(isRanklistIdentityClick({ detail: 0, clientX: 0, target: cell, currentTarget: cell }, 1)).toBe(true);
    expect(isRanklistIdentityClick({ detail: 1, clientX: 0, target: cell.firstChild, currentTarget: cell }, 1)).toBe(
      true,
    );
  });
});
