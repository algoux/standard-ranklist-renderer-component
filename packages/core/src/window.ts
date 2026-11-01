/** A controlled display window. Ranking/statistics must always use the complete data. */
export interface RanklistRowWindow {
  start: number;
  end: number;
}

/** Optional rendering controls shared by every framework adapter. */
export interface RanklistWindowOptions {
  /** Zero-based, end-exclusive range of fully rendered rows; all row positions remain in the table. */
  rowWindow?: RanklistRowWindow;
  /** Keep each offscreen participant's real name/organization text available to native browser Find. */
  retainUserText?: boolean;
  /** Physical column widths in pixels. The Name column absorbs spare container width. */
  columnWidths?: readonly number[];
  /** Uniform minimum participant row height in pixels. Content is never clipped to force this height. */
  rowHeight?: number;
}

export function normalizeRanklistRowWindow(
  window: RanklistRowWindow | undefined,
  count: number,
): RanklistRowWindow | undefined {
  if (!window || !Number.isFinite(window.start) || !Number.isFinite(window.end)) return undefined;
  const start = Math.max(0, Math.min(count, Math.floor(window.start)));
  const end = Math.max(start, Math.min(count, Math.floor(window.end)));
  return { start, end };
}

export function isRanklistRowInWindow(index: number, window: RanklistRowWindow | undefined): boolean {
  return !window || (index >= window.start && index < window.end);
}

export function normalizeRanklistRowHeight(height: number | undefined): number | undefined {
  return typeof height === 'number' && Number.isFinite(height) && height > 0 ? height : undefined;
}

export interface RanklistColumnLayoutOptions {
  seriesCount: number;
  problemCount: number;
  splitOrganization?: boolean;
  showTimeColumn?: boolean;
  showDirtColumn?: boolean;
  showSEColumn?: boolean;
  hasRevealDivider?: boolean;
  revealedProblemCount?: number;
}

/** No DOM access: the same layout is available to SSR and the first client render. */
export function getRanklistTableLayout(widths: readonly number[] | undefined, options: RanklistColumnLayoutOptions) {
  const userColumn = options.seriesCount + (options.splitOrganization ? 1 : 0);
  const leftColumnCount = userColumn + 2 + (options.showTimeColumn ? 1 : 0);
  const totalColumns =
    leftColumnCount + options.problemCount + (options.showDirtColumn ? 1 : 0) + (options.showSEColumn ? 1 : 0);
  if (!widths || widths.length !== totalColumns || widths.some((width) => !Number.isFinite(width) || width <= 0))
    return undefined;
  const revealedEnd = leftColumnCount + Math.max(0, Math.min(options.problemCount, options.revealedProblemCount || 0));
  const groups = options.hasRevealDivider
    ? [
        { start: 0, end: leftColumnCount, className: '' },
        { start: leftColumnCount, end: revealedEnd, className: 'srk-ccpc26-revealed-columns' },
        { start: revealedEnd, end: totalColumns, className: '' },
      ]
    : [{ start: 0, end: totalColumns, className: '' }];
  return {
    userColumn,
    totalColumns,
    leftColumnCount,
    groups: groups
      .filter((group) => group.end > group.start)
      .map((group) => ({
        ...group,
        columns: widths.slice(group.start, group.end).map((width, index) => ({
          index: group.start + index,
          width: group.start + index === userColumn ? 'auto' : `${width}px`,
        })),
      })),
    style: {
      tableLayout: 'fixed' as const,
      width: '100%',
      minWidth: `${widths.reduce((sum, width) => sum + width, 0)}px`,
      '--srk-search-ranks-width': `${widths.slice(0, options.seriesCount).reduce((sum, width) => sum + width, 0)}px`,
      '--srk-search-tail-width': `${widths.slice(userColumn + 1).reduce((sum, width) => sum + width, 0)}px`,
      '--srk-search-org-width': `${Math.max(0, (widths[options.seriesCount] || 0) - 16)}px`,
    },
  };
}

/** A light cell spans other columns; only its real Name column is a pointer target.
 * Text and keyboard/assistive activation remain valid even with zero coordinates. */
export function isRanklistIdentityClick(
  event: {
    detail?: number;
    clientX?: number;
    target?: EventTarget | null;
    currentTarget?: EventTarget | null;
  },
  userColumn: number,
): boolean {
  if (!event.detail) return true;
  const target = event.target as Element | null;
  if (target?.closest?.('[data-search-text]') || target?.parentElement?.closest?.('[data-search-text]')) return true;
  const cell = event.currentTarget as HTMLElement | null;
  const header = cell?.closest('table')?.tHead?.rows[0]?.cells[userColumn];
  if (!header || typeof event.clientX !== 'number') return true;
  const bounds = header.getBoundingClientRect();
  return event.clientX >= bounds.left && event.clientX <= bounds.right;
}
