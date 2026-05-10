import type * as srk from '@algoux/standard-ranklist';
import { convertToStaticRanklist } from '@algoux/standard-ranklist-utils';
import { describe, expect, it, vi } from 'vitest';
import emptyRanklist from '../fixtures/ranklist/empty-ranklist.json';
import noTimeColumnRanklist from '../fixtures/ranklist/no-time-column.json';
import problemHeadersRanklist from '../fixtures/ranklist/problem-headers.json';
import seriesSegmentsRanklist from '../fixtures/ranklist/series-segments.json';
import statusResultsRanklist from '../fixtures/ranklist/status-results.json';
import usersMarkersAssetsRanklist from '../fixtures/ranklist/users-markers-assets.json';
import unsupportedTypeRanklist from '../fixtures/unsupported-type.json';
import unsupportedVersionRanklist from '../fixtures/unsupported-version.json';
import {
  expectTextIncludes,
  getBodyRows,
  getHeaderTexts,
  getProblemHeaders,
  getRowByText,
  getTable,
  requireAll,
  requireElement,
  textOf,
} from './ranklist-dom-assertions';

export interface RanklistDisplayRenderProps {
  borderedRows?: boolean;
  stripedRows?: boolean;
  formatSrkAssetUrl?: (url: string, field: string) => string;
}

export interface RenderedRanklist {
  container: HTMLElement;
  cleanup?: () => void | Promise<void>;
}

export interface RanklistDisplayAdapter {
  target: string;
  render: (
    data: ReturnType<typeof convertStatic> | srk.Ranklist,
    props?: RanklistDisplayRenderProps,
  ) => RenderedRanklist | Promise<RenderedRanklist>;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

function convertStatic(value: srk.Ranklist) {
  return convertToStaticRanklist(clone(value));
}

async function withRendered(
  adapter: RanklistDisplayAdapter,
  rawData: srk.Ranklist,
  assertions: (container: HTMLElement) => void | Promise<void>,
  props?: RanklistDisplayRenderProps,
) {
  const rendered = await adapter.render(convertStatic(rawData), props);
  try {
    await assertions(rendered.container);
  } finally {
    await rendered.cleanup?.();
  }
}

async function withRawRendered(
  adapter: RanklistDisplayAdapter,
  rawData: srk.Ranklist,
  assertions: (container: HTMLElement) => void | Promise<void>,
) {
  const rendered = await adapter.render(clone(rawData));
  try {
    await assertions(rendered.container);
  } finally {
    await rendered.cleanup?.();
  }
}

export function describeRanklistDisplayContract(adapter: RanklistDisplayAdapter) {
  describe(`${adapter.target} Ranklist display contract`, () => {
    it('maps SRK problem status results to stable status cells', async () => {
      await withRendered(adapter, statusResultsRanklist as srk.Ranklist, (container) => {
        expect(getHeaderTexts(container)).toEqual(['Name', 'Score', 'Time', 'A', 'B', 'C', 'D', 'E']);
        expect(getBodyRows(container)).toHaveLength(1);

        const fbCell = requireElement(container, 'td.srk-prest-status-block-fb');
        expectTextIncludes(fbCell, '100');
        expectTextIncludes(requireElement(fbCell, '.srk-prest-status-block-score-details'), '1/12');

        expectTextIncludes(requireElement(container, 'td.srk-prest-status-block-accepted'), '2/34');
        expectTextIncludes(requireElement(container, 'td.srk-prest-status-block-failed'), '3');
        expectTextIncludes(requireElement(container, 'td.srk-prest-status-block-frozen'), '4');
        expect(requireAll(container, 'td.srk-prest-status-block')).toHaveLength(4);

        const rowCells = Array.from(requireElement(container, 'tbody tr').querySelectorAll('td'));
        const emptyStatusCell = rowCells[rowCells.length - 1];
        expect(textOf(emptyStatusCell)).toBe('');
        expect(emptyStatusCell.classList.contains('srk-prest-status-block')).toBe(false);
      });
    });

    it('renders score and time columns only when row score time exists', async () => {
      await withRendered(adapter, statusResultsRanklist as srk.Ranklist, (container) => {
        expect(getHeaderTexts(container)).toContain('Time');
        expectTextIncludes(getRowByText(container, 'Status Matrix'), '2');
        expectTextIncludes(getRowByText(container, 'Status Matrix'), '46');
      });

      await withRendered(adapter, noTimeColumnRanklist as srk.Ranklist, (container) => {
        expect(getHeaderTexts(container)).not.toContain('Time');
        expectTextIncludes(getRowByText(container, 'No Time Team'), '0');
      });
    });

    it('renders problem aliases, statistics, links, and header styles', async () => {
      await withRendered(adapter, problemHeadersRanklist as srk.Ranklist, (container) => {
        const problemHeaders = getProblemHeaders(container);
        expect(problemHeaders).toHaveLength(2);

        expectTextIncludes(problemHeaders[0], 'A');
        expectTextIncludes(problemHeaders[0], '3');
        expect(requireElement(problemHeaders[0], '.srk-problem-stats').getAttribute('title')).toBe('3 / 6 (50.0%)');
        expect(requireElement<HTMLAnchorElement>(problemHeaders[0], 'a').href).toBe('https://example.com/problems/a');

        expectTextIncludes(problemHeaders[1], 'Z');
        expectTextIncludes(problemHeaders[1], '0');
      });
    });

    it('renders user identity, fallback i18n text, avatars, and markers', async () => {
      const formatSrkAssetUrl = vi.fn((url: string, field: string) => `proxied:${field}:${url}`);

      await withRendered(
        adapter,
        usersMarkersAssetsRanklist as srk.Ranklist,
        (container) => {
          const alphaRow = getRowByText(container, 'Team Alpha');
          expectTextIncludes(alphaRow, 'Alpha Org');
          expect(requireElement<HTMLImageElement>(alphaRow, 'img[alt="User Avatar"]').getAttribute('src')).toBe(
            'proxied:user.avatar:https://cdn.example.com/alpha.png',
          );
          expect(formatSrkAssetUrl).toHaveBeenCalledWith('https://cdn.example.com/alpha.png', 'user.avatar');

          const alphaMarkers = Array.from(alphaRow.querySelectorAll('.srk-marker-dot')) as HTMLElement[];
          expect(alphaMarkers).toHaveLength(2);
          expect(alphaMarkers[0].classList.contains('srk-preset-marker-pink')).toBe(true);
          expect(alphaMarkers[0].dataset.tooltip).toBe('Girls Team');
          expect(alphaMarkers[1].dataset.tooltip).toBe('Guest Marker');
          expect(alphaMarkers[1].getAttribute('style') || alphaMarkers[1].style.backgroundColor).toMatch(
            /(4caf50|76,\s*175,\s*80)/i,
          );

          const deprecatedMarkerRow = getRowByText(container, 'Deprecated Marker Team');
          const deprecatedMarkers = deprecatedMarkerRow.querySelectorAll('.srk-marker-dot');
          expect(deprecatedMarkers).toHaveLength(1);
          expect((deprecatedMarkers[0] as HTMLElement).dataset.tooltip).toBe('Girls Team');

          const missingMarkerRow = getRowByText(container, 'Missing Marker Team');
          expect(missingMarkerRow.querySelectorAll('.srk-marker-dot')).toHaveLength(0);
        },
        { formatSrkAssetUrl },
      );
    });

    it('renders series segment classes, custom segment style, and unofficial ranks', async () => {
      await withRendered(adapter, seriesSegmentsRanklist as srk.Ranklist, (container) => {
        const goldRankCell = requireElement(getRowByText(container, 'Gold Team'), 'td');
        expect(textOf(goldRankCell)).toBe('1');
        expect(goldRankCell.classList.contains('srk-preset-series-segment-gold')).toBe(true);

        const silverRankCell = requireElement(getRowByText(container, 'Silver Team'), 'td');
        expect(textOf(silverRankCell)).toBe('2');
        expect(silverRankCell.classList.contains('srk-preset-series-segment-silver')).toBe(true);

        const bronzeRankCell = requireElement(getRowByText(container, 'Bronze Team'), 'td');
        expect(textOf(bronzeRankCell)).toBe('3');
        expect(bronzeRankCell.classList.contains('srk-preset-series-segment-bronze')).toBe(true);

        const customRankCell = requireElement(getRowByText(container, 'Custom Segment Team'), 'td') as HTMLElement;
        expect(textOf(customRankCell)).toBe('4');
        expect(customRankCell.getAttribute('style') || customRankCell.style.backgroundColor).toMatch(
          /(334455|51,\s*68,\s*85)/i,
        );

        const unofficialRankCell = requireElement(getRowByText(container, 'Unofficial Team'), 'td');
        expect(textOf(unofficialRankCell)).toBe('＊');
        expect(unofficialRankCell.className).not.toContain('srk-preset-series-segment-');
      });
    });

    it('applies table modifier props and renders an empty ranklist table', async () => {
      await withRendered(
        adapter,
        emptyRanklist as srk.Ranklist,
        (container) => {
          const table = getTable(container);
          expect(table.classList.contains('srk-table-row-bordered')).toBe(true);
          expect(table.classList.contains('srk-table-row-striped')).toBe(true);
          expect(getHeaderTexts(container)).toEqual(['Name', 'Score']);
          expect(getBodyRows(container)).toHaveLength(0);
        },
        { borderedRows: true, stripedRows: true },
      );
    });

    it('renders unsupported SRK type and version fallbacks', async () => {
      await withRawRendered(adapter, unsupportedTypeRanklist as srk.Ranklist, (container) => {
        expect(textOf(container)).toContain('srk type "score" is not supported');
      });

      await withRawRendered(adapter, unsupportedVersionRanklist as srk.Ranklist, (container) => {
        expect(textOf(container)).toContain('srk version "0.4.0" is not supported');
      });
    });
  });
}
